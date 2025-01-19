import * as Native from "phoenix"
import { v4 as uuid } from "uuid"
import { type Event, JoinEvents, PhoenixMessages } from "./Event"
import { Push } from "./Push"
import * as Phoenix from "./shims/Phoenix"
import {
  Socket,
  type SocketEvent,
  Events as SocketEvents,
  type Snapshot as SocketSnapshot,
} from "./Socket"

export type Subscriber<Ev = unknown, State = unknown> = (event: Ev) => State
export type Topic = string

export interface Snapshot {
  channelStatus: ChannelStatus
  isSubscribed: boolean
  hasSubscribers: boolean
  events: Event[]
  pushes: Push[]
  socketSnapshot: SocketSnapshot
}

enum JoinErrorReason {
  UnmatchedTopic = "unmatched topic",
}

export enum ChannelStatus {
  NotInitialized = "NOT_INITIALIZED",
  Joining = "JOINING",
  Joined = "JOINED",
  JoinError = "JOIN_ERROR",
  Leaving = "LEAVING",
  Closed = "CLOSED",
}

export enum SubscriberStatus {
  Subscribed = "SUBSCRIBED",
  Unsubscribed = "UNSUBSCRIBED",
}

type JoinError = Event<JoinEvents.Error, string, { reason: JoinErrorReason }>
type SubscriberRef = string

export type ChannelEvent =
  | { topic: Topic; type: JoinEvents.Error }
  | { topic: Topic; type: SocketEvents.ConnectError }
  | { topic: Topic; type: SocketEvents.Close }
  | { topic: Topic; type: SocketEvents.Open }

export class Channel {
  public id: string
  public topic: Topic
  public pushes: Map<Phoenix.EventRef, Push> = new Map()
  public subscribers: Map<SubscriberRef, Subscriber> = new Map()
  public events: Event[] = []

  private joinPush: Push | null = null

  constructor(public channel: Phoenix.Channel, public socket: Socket) {
    this.id = uuid()
    this.topic = this.channel.topic
    this.channel.join = this.__join.bind(this)
    this.socket.subscribe(this.id, (ev) => this.onSocketEvent(ev))
  }

  public subscribe<Ev, State>(
    subscriberRef: SubscriberRef,
    callback: Subscriber<Ev, State>,
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
      channelStatus: this.channelStatus(),
      hasSubscribers: this.subscribers.size > 0,
      events: [...this.events],
      pushes: Array.from(this.pushes.values()),
      isSubscribed: this.subscribers.has(subscriberId),
      socketSnapshot: this.socket.snapshot(this.id),
    }

    return this.lastSnapshot!
  }

  public channelStatus(): ChannelStatus {
    switch (this.channel.state) {
      case Phoenix.ChannelState.Joined:
        return ChannelStatus.Joined
      case Phoenix.ChannelState.Joining:
        return ChannelStatus.Joining
      case Phoenix.ChannelState.Errored:
        return ChannelStatus.JoinError
      case Phoenix.ChannelState.Leaving:
        return ChannelStatus.Leaving
      case Phoenix.ChannelState.Closed:
        return ChannelStatus.Closed
    }
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
    const ev = this.parseEvent(event)
    this.subscribers.values().forEach((dispatch) => dispatch(ev))
    switch (ev.type) {
      case JoinEvents.Error:
        return this.handleJoinError(ev as JoinError)

      case SocketEvents.ConnectError:
        return this.handleSocketConnectError()
    }
  }

  private handleSocketConnectError(): void {}

  private onSocketEvent(event: SocketEvent): void {
    switch (event.event) {
      case SocketEvents.ConnectError:
      case SocketEvents.Close:
      case SocketEvents.Open:
        return this.dispatch({ type: event.event, topic: this.topic })
    }
  }

  private parseEvent(event: ChannelEvent): ChannelEvent {
    switch (event.type) {
      // case PushEvents.Error:
      //   return this.parsePushError(event)
      case SocketEvents.ConnectError:
      case SocketEvents.Close:
      case SocketEvents.Open:
      default:
        return event
    }
  }

  private parsePushError(event: Event): Event {
    return event.message === PhoenixMessages.Join
      ? { ...event, type: JoinEvents.Error }
      : event
  }

  public handleJoinError(event: JoinError): void {
    console.error(event.payload.reason, event)
    if (event.payload.reason === JoinErrorReason.UnmatchedTopic) {
      this.leave()
    }
  }

  public joinOnce(timeout?: number): Push {
    if (this.joinPush) {
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
