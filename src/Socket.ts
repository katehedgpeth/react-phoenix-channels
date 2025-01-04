import * as Phoenix from "phoenix"
import { Channel, type Options as ChannelOptions, type Topic } from "./Channel"

type Endpoint = string

type CallbackRef = string

export interface Options extends Phoenix.SocketConnectOption {
  allowMultipleChannels: boolean
  endpoint: Endpoint
}

export class Socket extends Phoenix.Socket {
  public channels: Array<Channel> = []
  constructor(public endpoint: string, public options: Partial<Options> = {}) {
    const opts: Partial<Options> = {
      timeout: 300_000,
      heartbeatIntervalMs: 10_000,
      reconnectAfterMs: (tries: number | undefined) => {
        if (!tries || tries < 5) {
          return 100
        } else if (tries < 10) {
          return 250
        } else if (tries < 20) {
          return 500
        } else if (tries < 100) {
          return 1000
        }

        return 5000
      },
      longPollFallbackMs: 0,
      ...options,
    }
    super(endpoint, opts)

    this.options = opts

    this.connect()
  }

  /**
   * Registers callbacks for connection open events. If the socket is already
   * connected when this method is called, it will be invoked immediately in
   * addition to being registered for any future open events.
   */
  public onOpen(callback: () => void): CallbackRef {
    if (this.isConnected()) {
      callback()
    }

    return super.onOpen(callback)
  }

  public channel(topic: Topic, params: Partial<ChannelOptions>): Channel {
    const existing = this.channels.find((c) => c.topic === topic)

    if (existing) {
      return existing
    }

    const newChannel = new Channel(topic, params, this)
    this.channels.push(newChannel)
    return newChannel
  }
}
