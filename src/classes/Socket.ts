import * as Native from "phoenix"
import { Channel } from "./Channel"
import { HeartbeatEvents, type Topic } from "./Event"
import * as Phoenix from "./shims/Phoenix/index"

export type Options = Partial<Phoenix.SocketConnectOption>

export enum SocketStatus {
  NotInitialized = "NOT_INITIALIZED",
  Connecting = "CONNECTING",
  Open = "OPEN",
  Closing = "CLOSING",
  Closed = "CLOSED",
  ConnectionLost = "CONNECTION_LOST",
}

export enum SocketEvents {
  Connecting = "SOCKET_CONNECTING",
  Open = "SOCKET_OPEN",
  Closing = "SOCKET_CLOSING",
  NormalClose = "SOCKET_NORMAL_CLOSE",
  AbnormalClose = "SOCKET_ABNORMAL_CLOSE",
  Error = "SOCKET_ERROR",
}

export enum SocketCloseCodes {
  Normal = 1000,
  GoingAway = 1001,
  ProtocolError = 1002,
  UnsupportedData = 1003,
  NoStatus = 1005,
  Abnormal = 1006,
  InvalidData = 1007,
  PolicyViolation = 1008,
  TooBig = 1009,
  MandatoryExtension = 1010,
  ServerError = 1011,
  ServiceRestart = 1012,
  TryAgainLater = 1013,
  BadGateway = 1014,
  TLSHandshake = 1015,
  Unknown = -1,
}

interface UnknownSocketMessage {
  event: Phoenix.SocketMessages
  ref: Phoenix.EventRef | null
  joinRef: Phoenix.JoinRef | null
  payload: object
  topic: Topic
}

interface MessageReply {
  event: Phoenix.SocketMessages.Reply
  joinRef: null
  ref: string
  topic: Topic
  payload: {
    status: "ok" | "error"
    response: object
  }
}

type SocketMessage = MessageReply | UnknownSocketMessage

export interface SocketNormalCloseEvent {
  event: SocketEvents.NormalClose
  payload: {
    event: CloseEvent
    reason: SocketCloseCodes
    code: number
  }
}

export interface SocketAbnormalCloseEvent {
  event: SocketEvents.AbnormalClose
  payload: {
    event: CloseEvent
    reason: SocketCloseCodes
    code: number
  }
}

export interface SocketErrorEvent {
  event: SocketEvents.Error
  payload: {
    error: Phoenix.SocketError
    transport: WebSocket["constructor"] | Native.LongPoll["constructor"]
    establishedConnections: number
  }
}

export interface SocketConnectingEvent {
  event: SocketEvents.Connecting
  payload: undefined
}

export interface SocketClosingEvent {
  event: SocketEvents.Closing
  payload: undefined
}

export interface SocketOpenEvent {
  event: SocketEvents.Open
  payload: undefined
}

export interface Snapshot {
  connectionStatus: SocketStatus
  hasErrors: boolean
  hasSubscribers: boolean
  channels: Channel[]
  isSubscribed: boolean
}

type SocketCloseEvent = SocketNormalCloseEvent | SocketAbnormalCloseEvent

interface HeartbeatSendEvent {
  event: HeartbeatEvents.Send
  payload: undefined
}
interface HeartbeatReplyEvent {
  event: HeartbeatEvents.Reply
  payload: {
    status: "ok" | "error"
  }
}

export type SocketEvent =
  | SocketConnectingEvent
  | SocketOpenEvent
  | SocketClosingEvent
  | SocketNormalCloseEvent
  | SocketAbnormalCloseEvent
  | SocketErrorEvent
  | HeartbeatSendEvent
  | HeartbeatReplyEvent

type SubscriberId = string
type Dispatch = (event: SocketEvent) => void

interface PushToServer {
  event: string
  payload: object | undefined
  ref: Phoenix.EventRef
  topic: Topic
}

export class Socket {
  public subscribers: Map<SubscriberId, Dispatch> = new Map()
  private changeSubscribers: Map<SubscriberId, () => void> = new Map()
  public socket: Phoenix.Socket
  public channels: Map<Topic, Channel> = new Map()
  public id: string
  public connectionStatus: SocketStatus = SocketStatus.NotInitialized
  public errors: Array<SocketErrorEvent | SocketAbnormalCloseEvent> = []

  private pushes: Map<Topic, Map<Phoenix.EventRef, PushToServer>> = new Map()

  private conn: WebSocket | Native.LongPoll | null = null

  constructor(public url: string, public options: Options) {
    this.id = window.crypto.randomUUID()
    this.socket = new Native.Socket(url, options) as Phoenix.Socket
    this.socket.push = this.push.bind(this)
    this.socket.onClose((ev) => this.onClose(ev))
    this.socket.onError((ev, transport, establishedConnections) =>
      this.onError(
        ev as Phoenix.SocketError,
        transport,
        establishedConnections,
      ),
    )
    this.socket.onMessage((msg) => this.onMessage(msg as SocketMessage))
    this.socket.onOpen(() => this.onOpen())
    this.socket.channel = this.channelListener.bind(this)
    this.socket.transportConnect = this.transportConnect.bind(this)
  }

  public connect(): () => void {
    if (this.connectionStatus === SocketStatus.NotInitialized) {
      this.socket.connect()
    }
    return () => {
      this.disconnect()
    }
  }

  public disconnect(): void {
    this.updateConnectionStatus(SocketStatus.Closing, {
      event: SocketEvents.Closing,
      payload: undefined,
    })
    this.socket.disconnect()
  }

  public channelListener(topic: Topic, params: object): Phoenix.Channel {
    const channel = this.getOrCreateChannel(topic, params)
    return channel.channel
  }

  public getOrCreateChannel(topic: Topic, params: object): Channel {
    const existing = this.channels.get(topic)

    if (existing) {
      return existing
    }

    const phxChannel = Native.Socket.prototype.channel.bind(this.socket)(
      topic,
      params,
    ) as Phoenix.Channel
    const channel = new Channel(phxChannel, this)

    this.channels.set(topic, channel)

    return channel
  }

  public leaveChannel(topic: Topic): void {
    // TODO: do we need to force all subscribers to unsubscribe from the channel?
    this.channels.delete(topic)
  }

  public subscribe(subscriberId: SubscriberId, dispatch: Dispatch): () => void {
    this.subscribers.set(subscriberId, dispatch)
    return () => this.subscribers.delete(subscriberId)
  }

  private currentSnapshot(subscriberId: SubscriberId): Snapshot {
    return {
      connectionStatus: this.connectionStatus,
      channels: Array.from(this.channels.values()),
      hasErrors: this.errors.length > 0,
      hasSubscribers: this.subscribers.size > 0,
      isSubscribed: this.subscribers.has(subscriberId),
    }
  }

  static snapshotHasChanged(prev: Snapshot, current: Snapshot): boolean {
    return Object.keys(current).some((k) => {
      const key = k as keyof Snapshot
      switch (key) {
        case "connectionStatus":
        case "hasErrors":
        case "hasSubscribers":
        case "isSubscribed":
          return current[key] !== prev[key]

        case "channels":
          return Socket.haveChannelsChanged(prev.channels, current.channels)
      }
    })
  }

  public snapshot(subscriberId: SubscriberId, prev?: Snapshot): Snapshot {
    const current = this.currentSnapshot(subscriberId)
    if (!prev) {
      return current
    }
    return Socket.snapshotHasChanged(prev, current) ? current : prev
  }

  private push(event: {
    event: string
    payload: object | undefined
    ref: Phoenix.EventRef
    topic: Topic
  }): void {
    Native.Socket.prototype.push.bind(this.socket)(event)
    this.handlePush(event)
  }

  private handlePush(event: PushToServer): void {
    const topicPushes = this.pushes.get(event.topic) || new Map()
    topicPushes.set(event.ref, event)
    this.pushes.set(event.topic, topicPushes)
  }

  private static haveChannelsChanged(
    prevChannels: Channel[],
    currentChannels: Channel[],
  ) {
    if (prevChannels.length !== currentChannels.length) {
      return true
    }
    const prevSet = new Set(prevChannels.map((c) => c.id))
    const currentSet = new Set(currentChannels.map((c) => c.id))
    return prevSet.difference(currentSet).size > 0
  }

  private onOpen(): void {
    this.updateConnectionStatus(SocketStatus.Open, {
      event: SocketEvents.Open,
      payload: undefined,
    })
  }

  private onClose(closeEvent: CloseEvent): void {
    const [status, ev] = this.closedStatus(closeEvent.code)
    const event: SocketCloseEvent = {
      event: ev,
      payload: {
        event: closeEvent,
        reason: (SocketCloseCodes[closeEvent.code] ||
          SocketCloseCodes.Unknown) as SocketCloseCodes,
        code: closeEvent.code,
      },
    }
    if (event.event === SocketEvents.AbnormalClose) {
      this.errors.push(event)
    }
    this.updateConnectionStatus(status, event)
  }

  private closedStatus(
    code: number,
  ):
    | [SocketStatus.Closed, SocketEvents.NormalClose]
    | [SocketStatus.ConnectionLost, SocketEvents.AbnormalClose] {
    if (code === SocketCloseCodes.Normal) {
      return [SocketStatus.Closed, SocketEvents.NormalClose]
    }
    return [SocketStatus.ConnectionLost, SocketEvents.AbnormalClose]
  }

  private onError(
    error: Phoenix.SocketError,
    transport: WebSocket["constructor"] | Native.LongPoll["constructor"],
    establishedConnections: number,
  ): void {
    const event: SocketErrorEvent = {
      event: SocketEvents.Error,
      payload: {
        error,
        transport,
        establishedConnections,
      },
    }

    this.errors.push(event)
    this.subscribers.forEach((dispatch) => dispatch(event))
  }

  private onMessage(msg: SocketMessage): void {
    if (msg.ref) {
      const topicPushes = this.pushes.get(msg.topic)
      if (topicPushes) {
        const push = topicPushes.get(msg.ref)
        if (push) {
          topicPushes.delete(msg.ref)
          if (push.topic === "phoenix" && push.event === "heartbeat") {
            this.subscribers.forEach((dispatch) => {
              dispatch({
                event: HeartbeatEvents.Reply,
                payload: msg.payload,
              } as HeartbeatReplyEvent)
            })
          }
        }
        if (topicPushes.size === 0) {
          this.pushes.delete(msg.topic)
        }
      }
    }
  }

  private transportConnect(): void {
    this.errors = []
    this.updateConnectionStatus(SocketStatus.Connecting, {
      event: SocketEvents.Connecting,
      payload: undefined,
    })

    // @ts-expect-error transportConnect does exist on the socket class
    Native.Socket.prototype.transportConnect.bind(this.socket)()
    this.conn = this.socket.conn as WebSocket
    this.conn.addEventListener("error", (ev) => {
      console.error("WEBSOCKET_ERROR_EVENT", ev, this.socket)
    })
  }

  private updateConnectionStatus(
    status: SocketStatus,
    event: SocketEvent,
  ): void {
    if (status !== this.connectionStatus) {
      this.connectionStatus = status
      this.subscribers.forEach((dispatch) => {
        dispatch(event)
      })
    }
  }
}
