import * as Native from "phoenix"
import { v4 as uuid } from "uuid"
import {
  type ChannelEvent,
  type Event,
  type JoinEvent,
  JoinEvents,
  type JoinTimeout,
  type PushEvent,
  PushEvents,
  type Topic,
} from "./Event"
import { Push } from "./Push"
import * as Phoenix from "./shims/Phoenix"
import {
  Socket,
  type SocketCloseEvent,
  type SocketEvent,
  SocketEvents,
  type Snapshot as SocketSnapshot,
} from "./Socket"

export type Subscriber<Ev = unknown, State = unknown> = (event: Ev) => State

export interface Snapshot {
  channelStatus: ChannelStatus
  isSubscribed: boolean
  hasSubscribers: boolean
  events: ChannelEvent[]
  pushes: Push[]
  socketSnapshot: SocketSnapshot
}

enum JoinErrorReason {
  UnmatchedTopic = "unmatched topic",
  Unauthorized = "unauthorized",
}

export enum ChannelStatus {
  NotInitialized = "NOT_INITIALIZED",
  Joining = "JOINING",
  Joined = "JOINED",
  JoinError = "JOIN_ERROR",
  Leaving = "LEAVING",
  Closed = "CLOSED",
  SocketError = "SOCKET_ERROR",
}

export enum SubscriberStatus {
  Subscribed = "SUBSCRIBED",
  Unsubscribed = "UNSUBSCRIBED",
}

interface JoinError extends Event {
  type: JoinEvents.Error
  payload: {
    reason: JoinErrorReason
  }
}
type SubscriberRef = string

export class Channel {
  public id: string
  public topic: Topic
  public pushes: Map<Phoenix.EventRef, Push> = new Map()
  public subscribers: Map<SubscriberRef, Subscriber> = new Map()
  public events: ChannelEvent[] = []
  public status: ChannelStatus = ChannelStatus.NotInitialized

  private joinPush: Push | null = null

  constructor(public channel: Phoenix.Channel, public socket: Socket) {
    this.id = uuid()
    this.topic = this.channel.topic
    this.channel.join = this.__join.bind(this)
    this.socket.subscribe(this.id, (ev) => this.handleSocketEvent(ev))
  }

  public subscribe<Events>(
    subscriberRef: SubscriberRef,
    callback: Subscriber<Events>,
  ): () => void {
    this.subscribers.set(subscriberRef, callback as Subscriber)
    return () => this.subscribers.delete(subscriberRef)
  }

  public unsubscribe(subscriberId: SubscriberRef): void {
    this.subscribers.delete(subscriberId)
  }

  private lastSnapshot: Snapshot | null = null

  public snapshot(subscriberId: SubscriberRef): Snapshot {
    this.lastSnapshot = {
      channelStatus: this.status,
      hasSubscribers: this.subscribers.size > 0,
      events: [...this.events],
      pushes: Array.from(this.pushes.values()),
      isSubscribed: this.subscribers.has(subscriberId),
      socketSnapshot: this.socket.snapshot(this.id),
    }

    return this.lastSnapshot!
  }

  public subscriberStatus(subscriberId: SubscriberRef): SubscriberStatus {
    return this.subscribers.has(subscriberId)
      ? SubscriberStatus.Subscribed
      : SubscriberStatus.Unsubscribed
  }

  public leave(): void {
    this.channel.leave()
  }

  public dispatch(event: ChannelEvent): void {
    switch (event.type) {
      case JoinEvents.Error:
      case JoinEvents.Start:
      case JoinEvents.Success:
      case JoinEvents.Timeout:
        this.handleJoinEvent(event as JoinEvent)
        break

      case PushEvents.Send:
      case PushEvents.Error:
      case PushEvents.Success:
      case PushEvents.Timeout:
        this.handlePushEvent(event)
        break
    }
    this.subscribers.values().forEach((dispatch) => dispatch(event))
  }

  private handleSocketConnectError(): void {}

  private handleSocketEvent({ event, payload }: SocketEvent): void {
    switch (event) {
      case SocketEvents.Close:
      case SocketEvents.ConnectError:
      case SocketEvents.ConnectionLostError:
        this.status = ChannelStatus.Closed
        break
      case SocketEvents.Open:
        break
    }

    this.dispatch({
      type: event,
      topic: this.topic,
      message: event,
      payload,
    })
  }

  public handleJoinEvent(event: JoinEvent): void {
    const joinStatuses = {
      [JoinEvents.Start]: ChannelStatus.Joining,
      [JoinEvents.Success]: ChannelStatus.Joined,
      [JoinEvents.Timeout]: ChannelStatus.JoinError,
      [JoinEvents.Error]: ChannelStatus.JoinError,
    }
    this.status = joinStatuses[event.type]
    switch (event.type) {
      case JoinEvents.Error:
        return this.handleJoinError(event as JoinError)
      case JoinEvents.Timeout:
        return this.handleJoinTimeout(event)
      default:
        return
    }
  }

  private handlePushEvent(event: PushEvent): void {
    switch (event.type) {
      case PushEvents.Send:
        return
      case PushEvents.Error:
        return
      case PushEvents.Success:
        return
      case PushEvents.Timeout:
        return
    }
  }

  private handleJoinError(event: JoinError): void {
    console.error(event.payload.reason, event)
    if (event.payload.reason === JoinErrorReason.UnmatchedTopic) {
      this.leave()
    }
  }

  private handleJoinTimeout(event: JoinTimeout): void {
    console.error("Join Timeout", event)
  }

  public joinOnce(timeout?: number): Push {
    if (this.joinPush) {
      console.log(this.joinPush)
      return this.joinPush
    }

    return this.join(timeout)
  }

  private join(timeout?: number): Push {
    const phoenixPush = Native.Channel.prototype.join.bind(this.channel)(
      timeout,
    ) as Phoenix.Push

    this.joinPush = this.handlePush(phoenixPush)
    return this.joinPush
  }

  public __join(timeout?: number): Phoenix.Push {
    return this.join(timeout).push
  }

  public push(event: string, payload: object, timeout?: number): Push {
    const phoenixPush = Native.Channel.prototype.push.bind(this.channel)(
      event,
      payload,
      timeout,
    ) as Phoenix.Push

    const push = this.handlePush(phoenixPush)

    return push
  }
  public __push(
    event: string,
    payload: object,
    timeout?: number,
  ): Phoenix.Push {
    return this.push(event, payload, timeout).push
  }

  private handlePush(phoenixPush: Phoenix.Push): Push {
    const push = new Push(phoenixPush, this)

    this.pushes.set(push.ref!, push)
    return push
  }
}
