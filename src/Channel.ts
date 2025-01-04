import * as Phoenix from "phoenix"
import { type StoreApi, createStore } from "zustand/vanilla"
import { Socket } from "./Socket"

export type MessagePayload = string | Record<string, unknown>
export type Json = ReturnType<typeof JSON.parse>

export type Topic = string
export type Event = string
export type ListenerId = string

interface Message<Payload extends MessagePayload = MessagePayload> {
  type: string
  payload: Payload
}

type Callback = (message: Message) => void

type Closure<T> = T | (() => T)

export interface Options {
  params: Closure<JSON>
  socket: Closure<Socket>
}

export class Channel<T = Json> extends Phoenix.Channel {
  private listeners: Map<ListenerId, Callback> = new Map()

  private messages = createStore<T>((store) => store as T)

  public joinedOnce = false

  constructor(
    public topic: string,
    private params: Closure<Json>,
    socket: Socket,
  ) {
    super(topic, params, socket)
    this.join()
  }

  public listen(listenerId: ListenerId, callback: Callback): void {
    this.listeners.set(listenerId, callback)
  }

  public clearAllListeners(): void {
    this.listeners.clear()
    this.listeners = new Map()
  }

  public unlisten(listenerId: ListenerId): void {
    this.listeners.delete(listenerId)
  }

  public messageState<T>() {
    return this.messages as unknown as StoreApi<T>
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
