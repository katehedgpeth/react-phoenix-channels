import * as Phoenix from "phoenix"
import { createStore, StoreApi } from "zustand/vanilla"
import { Socket } from "./Socket"


export type MessagePayload = string | Record<string, unknown>
type Json = ReturnType<typeof JSON.parse>

export type Topic = string
export type Event = string
export type ListenerId = string

interface Message<Payload extends MessagePayload = MessagePayload> {
  type: string
  payload: Payload
}


type Callback = (message: Message) => void

const CHANNELS = new Map<Topic, Channel<JSON>>()

type Closure<T> = T | (() => T)

export interface Options {
  params: Closure<JSON>
  socket: Closure<Socket>
}

const closure = <T>(value: Closure<T>): () => T => {
  if (typeof value === "function") {
    return value as () => T
  }
  return () => value

}


export class Channel<T = Json> extends Phoenix.Channel {
  private listeners: Map<ListenerId, Callback> = new Map()

  private messages = createStore<T>((store) => store as T)


  static get<T>(topic: Topic, options: Partial<Options> = {}) {
    const params = closure(options.params || {})
    const socket = closure(options.socket || Socket.openSocket)()
    if (!CHANNELS.has(topic)) {
      return new Channel<T>(topic, params, socket)
    }

    return CHANNELS.get(topic)! as Channel<T>
  }

  constructor(
    public topic: string,
    private params: Closure<Json>,
    socket: Socket
  ) {
    if (CHANNELS.has(topic)) {
      throw new Error(`Channel with topic ${topic} already exists!`)
    }

    super(topic, params, socket)

    this.join()

    // .join() will throw if the channel has already been joined once,
    // so don't save the instance to CHANNELS until we've cleared that
    CHANNELS.set(topic, this as Channel)
  }

  public listen(listenerId: ListenerId, callback: Callback) {
    this.listeners.set(listenerId, callback)
  }

  public clearAllListeners() {
    this.listeners.clear()
    this.listeners = new Map()
  }

  public unlisten(listenerId: ListenerId) {
    this.listeners.delete(listenerId)
  }

  public messageState<T>() {
    return this.messages as unknown as StoreApi<T>
  }

  public onMessage(type: string, payload: MessagePayload) {
    this.messages.setState({ [type]: payload } as Partial<T>)
    // this.listeners.values().forEach((callback) => {
    //   callback({ type, payload })
    // })
    return payload
  }

  public join() {
    // @ts-ignore
    if (this.joinedOnce) {
      // @ts-ignore
      return this.joinPush
    }
    return super
      .join()
      .receive("ok", (payload) => this.onMessage("JOIN_SUCCESS", payload))
      .receive("error", (payload) => this.onMessage("JOIN_ERROR", payload))
      .receive("timeout", (payload) => this.onMessage("JOIN_TIMEOUT", payload))
  }
}
