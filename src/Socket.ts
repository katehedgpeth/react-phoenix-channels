import * as Phoenix from "phoenix"
import { Channel, Options as ChannelOptions } from "./Channel"

type Endpoint = string

export interface Options extends Phoenix.SocketConnectOption {
  allowMultipleSockets: boolean
  allowMultipleChannels: boolean
  endpoint: Endpoint
}

const ENDPOINTS = new Map<Endpoint, Socket>()


export class Socket extends Phoenix.Socket {

  static openSocket(endpoint?: string): Socket {
    if (endpoint) {
      const socket = ENDPOINTS.get(endpoint)
      if (!socket) {
        throw new Error(`No socket found for endpoint ${endpoint}`)
      }
      return socket
    }

    switch (ENDPOINTS.size) {
      case 0:
        throw new Error("No endpoint options saved!")
      case 1:
        return Array.from(ENDPOINTS.values())[0]
      default:
        throw new Error(`
          Cannot get default options - multiple endpoints saved:
          ${JSON.stringify(Array.from(ENDPOINTS.keys()))}
        `)
    }
  }

  static get(options: Partial<Options> & Pick<Options, "endpoint">) {
    if (options.allowMultipleSockets) {
      return new Socket(options.endpoint, options)
    }

    if (!ENDPOINTS.has(options.endpoint)) {
      ENDPOINTS.set(options.endpoint, new Socket(options.endpoint, options))
    }

    return ENDPOINTS.get(options.endpoint)!
  }

  static clearAll() {
    for (const socket of ENDPOINTS.values()) {
      socket.disconnect()
    }

    ENDPOINTS.clear()
  }


  constructor(public endpoint: string, public options: Partial<Options> = {}) {
    if (ENDPOINTS.has(endpoint) && !options.allowMultipleSockets) {
      throw new Error(`Socket for endpoint ${endpoint} already exists!`)
    }
    super(endpoint, {
      ...options,
      timeout: 300_000,
      heartbeatIntervalMs: 10_000,
      reconnectAfterMs: (tries) => {
        if (tries < 5) {
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
    })

    this.options = options

    this.connect()

    ENDPOINTS.set(endpoint, this)
  }

  public channel(channelId: string, chanParams: Partial<ChannelOptions>) {
    // if (!this.channels.has(channelId)) {
    //   this.channels.set(channelId, new Channel(channelId, chanParams))
    // }
    // return this.channels.get(channelId)!
    return Channel.get(channelId, chanParams)
  }
}

