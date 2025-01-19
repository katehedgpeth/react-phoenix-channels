import * as Phoenix from "./shims/Phoenix"
import { Channel } from "./Channel"
import { type Event, JoinEvents, PhoenixMessages, PushEvents } from "./Event"

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

  private dispatch(type: PushEvents, payload: object) {
    const event = this.parseEvent(type, payload)

    this.channel.dispatch(event)
  }

  private parseEvent(type: PushEvents, payload: object): Event {
    switch (type) {
      case PushEvents.Error:
        return this.parseError(payload)
      default:
        return {
          type,
          topic: this.topic,
          message: this.message,
          payload,
        }
    }
  }

  private parseError(payload: object): Event {
    return {
      topic: this.topic,
      message: this.message,
      payload,
      type:
        this.message === PhoenixMessages.Join
          ? JoinEvents.Error
          : PushEvents.Error,
    }
  }
}
