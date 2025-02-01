import { Channel } from "./Channel"
import { type ChannelEvent, JoinEvents, PushEvents } from "./Event"
import * as Phoenix from "./shims/Phoenix"

export class Push {
  public ref: string
  public message: string
  public refEvent: string
  public reply: object | null = null
  public topic: string

  private __send: Phoenix.Push["send"] = () => {
    throw new Error("__send not initialized")
  }

  constructor(public push: Phoenix.Push, public channel: Channel) {
    this.ref = push.ref
    this.refEvent = push.refEvent
    this.topic = channel.topic

    this.message = push.event
    this.__send = this.push.send.bind(this.push)
    this.push.send = this.send.bind(this)
    this.push
      .receive("ok", (response) => this.dispatch(PushEvents.Success, response))
      .receive("error", (error) => this.dispatch(PushEvents.Error, error))
      .receive("timeout", (error) => this.dispatch(PushEvents.Timeout, error))
  }

  public send(): void {
    this.__send()
    this.dispatch(PushEvents.Send, this.push.payload)
  }

  private dispatch(type: PushEvents, payload: object): void {
    const event = this.parseEvent(type, payload)

    this.channel.dispatch(event)
  }

  private isJoinPush(): boolean {
    return this.message === Phoenix.SocketMessages.Join
  }

  private parseEvent(type: PushEvents, payload: object): ChannelEvent {
    return {
      topic: this.topic,
      message: this.message,
      payload,
      type: this.parseEventType(type),
    } as ChannelEvent
  }

  private parseEventType(type: PushEvents): PushEvents | JoinEvents {
    if (this.isJoinPush()) {
      switch (type) {
        case PushEvents.Send:
          return JoinEvents.Start
        case PushEvents.Success:
          return JoinEvents.Success
        case PushEvents.Error:
          return JoinEvents.Error
        case PushEvents.Timeout:
          return JoinEvents.Timeout
        default:
          throw new Error(`Unknown join event type: ${type}`)
      }
    }
    return type
  }
}
