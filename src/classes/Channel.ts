import * as Phoenix from "phoenix"
import { type StoreApi, createStore } from "zustand/vanilla"
import { Socket } from "./Socket"

export type MessagePayload = string | Record<string, unknown>
export type Json = ReturnType<typeof JSON.parse>

export type Topic = string
export type Event = string
export type ListenerId = string

export type Callback<T> = (state: T, prevState: T) => void

export interface Options {
  params: Json | (() => Json)
  socket: Socket
}

export class Channel<T = Json> extends Phoenix.Channel {
  public joinedOnce = false

  public messages: StoreApi<T>
  private unsubscribes: Map<ListenerId, () => void> = new Map()

  constructor(topic: Topic, options: Options) {
    super(topic, options.params, options.socket)
    this.messages = Channel.newStore<T>()
    this.join()
  }

  public subscribe(listenerId: ListenerId, callback: Callback<T>): () => void {
    if (this.unsubscribes.has(listenerId)) {
      this.unsubscribes.delete(listenerId)
    }
    const unsubscribe = this.messages.subscribe(callback)
    this.unsubscribes.set(listenerId, unsubscribe)
    return unsubscribe
  }

  public unsubscribeAll(): void {
    this.unsubscribes.entries().forEach(([id, unsubscribe]) => {
      unsubscribe()
      this.unsubscribes.delete(id)
    })
    this.messages = Channel.newStore()
  }

  public push(event: Event, payload: Json): Phoenix.Push {
    console.log("PUSH", { event, payload })
    return super.push(event, payload)
  }

  static newStore<T>(): StoreApi<T> {
    return createStore<T>((store) => store as T)
  }

  public onMessage(type: string, payload: MessagePayload): MessagePayload {
    this.messages.setState({ [type]: payload } as Partial<T>)
    return payload
  }

  public join(timeout?: number): Phoenix.Push {
    if (this.joinedOnce) {
      // @ts-expect-error joinPush does exist on the Channel class, it's just
      // not exposed in the typescript library
      return this.joinPush
    }
    return super
      .join(timeout)
      .receive("ok", (payload) => this.onMessage("JOIN_SUCCESS", payload))
      .receive("error", (payload) => this.onMessage("JOIN_ERROR", payload))
      .receive("timeout", (payload) => this.onMessage("JOIN_TIMEOUT", payload))
  }
}
