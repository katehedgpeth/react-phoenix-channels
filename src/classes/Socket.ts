import * as Native from "phoenix"
import { v4 as uuid } from "uuid"
import { Channel } from "./Channel"
import { type Topic } from "./Event"
import { Push } from "./Push"
import * as Phoenix from "./shims/Phoenix"

export type Options = Partial<Phoenix.SocketConnectOption>

export enum SocketStatus {
  NotInitialized = "NOT_INITIALIZED",
  Connecting = "CONNECTING",
  ConnectError = "CONNECT_ERROR",
  Open = "OPEN",
  Closing = "CLOSING",
  Closed = "CLOSED",
  ConnectionLost = "CONNECTION_LOST",
}

export enum SocketEvents {
  Open = "SOCKET_OPEN",
  Close = "SOCKET_CLOSE",
  ConnectError = "SOCKET_CONNECT_ERROR",
  ConnectionLostError = "SOCKET_CONNECTION_LOST_ERROR",
}

interface SocketMessage {
  event: Phoenix.SocketMessages
  ref: Phoenix.EventRef | null
  joinRef: Phoenix.JoinRef | null
  payload: object
  topic: Topic
}

interface SocketCloseEvent {
  event: SocketEvents.Close
  payload: CloseEvent
}

interface SocketConnectionLostEvent {
  event: SocketEvents.ConnectionLostError
  payload: Phoenix.SocketError
}

interface SocketConnectErrorEvent {
  event: SocketEvents.ConnectError
  payload: Phoenix.SocketError
}

interface SocketOpenEvent {
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

export type SocketEvent =
  | SocketCloseEvent
  | SocketConnectionLostEvent
  | SocketOpenEvent
  | SocketConnectErrorEvent

type SubscriberId = string
type Dispatch = (event: SocketEvent) => void

interface SocketError {
  event: SocketEvents.ConnectionLostError | SocketEvents.ConnectError
  error: Phoenix.SocketError
}

export class Socket {
  public subscribers: Map<SubscriberId, Dispatch> = new Map()
  private changeSubscribers: Map<SubscriberId, () => void> = new Map()
  public socket: Phoenix.Socket
  public channels: Map<Topic, Channel> = new Map()
  public id: string
  public connectionStatus: SocketStatus = SocketStatus.NotInitialized

  private pushes: Map<Topic, Map<Phoenix.EventRef, Push>> = new Map()

  private conn: WebSocket | Native.LongPoll | null = null
  private errors: SocketError[] = []

  constructor(public url: string, public options: Options) {
    this.id = uuid()
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
      this.connectionStatus = SocketStatus.Connecting
      this.socket.connect()
    }
    return () => {
      this.socket.disconnect(() => {
        console.log("SOCKET_DISCONNECTED")
      })
    }
  }

  public status(): SocketStatus {
    const status = this.socket.connectionState()

    switch (status) {
      case Phoenix.SocketStatus.Connecting:
        return SocketStatus.Connecting
      case Phoenix.SocketStatus.Open:
        return SocketStatus.Open
      case Phoenix.SocketStatus.Closing:
        return SocketStatus.Closing
      case Phoenix.SocketStatus.Closed:
        return SocketStatus.Closed
      default:
        throw new Error(`Unknown socket status: ${status}`)
    }
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

  public subscribeToChanges(
    subscriberId: SubscriberId,
    callback: () => void,
  ): () => void {
    this.changeSubscribers.set(subscriberId, callback)
    return () => this.changeSubscribers.delete(subscriberId)
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

  private dispatchChange(): void {
    this.changeSubscribers.forEach((dispatch) => dispatch())
  }

  private push(event: object): void {
    // console.log("pushing to server:", event)
    Native.Socket.prototype.push.bind(this.socket)(event)
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

  private onOpen(...args: unknown[]): void {
    this.updateConnectionStatus(SocketStatus.Open)
    console.log("SOCKET_OPEN", ...args)
  }

  private onClose(event: CloseEvent): void {
    this.updateConnectionStatus(SocketStatus.Closed)
    this.subscribers.forEach((dispatch) => {
      dispatch({ event: SocketEvents.Close, payload: event })
    })
  }

  private onError(
    error: Phoenix.SocketError,
    transport: WebSocket["constructor"] | Native.LongPoll["constructor"],
    establishedConnections: number,
  ): void {
    console.error(error, { establishedConnections })
    const statuses = {
      [SocketEvents.ConnectError]: SocketStatus.ConnectError,
      [SocketEvents.ConnectionLostError]: SocketStatus.ConnectionLost,
    }
    const event =
      establishedConnections === 0
        ? SocketEvents.ConnectError
        : SocketEvents.ConnectionLostError

    this.errors.push({ event, error })
    this.updateConnectionStatus(statuses[event])

    if (error instanceof Event) {
      if (establishedConnections === 0) {
        this.subscribers.forEach((dispatch) => {
          dispatch({
            event,
            payload: error,
          })
        })
      }
    }

    this.dispatchChange()
  }

  private onMessage(msg: SocketMessage): void {
    console.log("SOCKET_MESSAGE", msg)
  }

  private transportConnect(): void {
    // @ts-expect-error transportConnect does exist on the socket class
    Native.Socket.prototype.transportConnect.bind(this.socket)()
    this.conn = this.socket.conn
    this.errors = []
    this.updateConnectionStatus(SocketStatus.Connecting)
  }

  private updateConnectionStatus(status: SocketStatus): void {
    if (status !== this.connectionStatus) {
      this.connectionStatus = status
      this.dispatchChange()
    }
  }
}
