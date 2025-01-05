import {
  HttpHandler,
  type HttpResponseResolver,
  type WebSocketData,
  WebSocketHandler,
  type WebSocketHandlerConnection,
  type WebSocketLink,
  http,
  ws,
} from "msw"
import { SetupServerApi, setupServer } from "msw/node"
import type { Event, Topic } from "src/classes/Channel"

export const WS_ENDPOINT = "wss://localhost:4000"

type Json = ReturnType<typeof JSON.parse>

interface ConnectionHandlers {
  onSocketConnect: (req: WebSocketHandlerConnection) => void
  onSocketClose: (req: WebSocketHandler) => void
}

const UNEXPECTED_HTTP_REQUEST: HttpResponseResolver = (req) => {
  throw new Error(`Unexpected HTTP request: ${req.request.url}`)
}

type MessageListener = (
  socket: WebSocketHandlerConnection,
  message: Json,
) => void

type ChannelListeners = Map<Topic, Map<Event, MessageListener>>

interface Options {
  endpoint?: string
  channelListeners?: ChannelListeners
  httpHandlers?: Array<HttpHandler>
}

/**
 * A mock implementation of a Phoenix Channel.
 *
 * The constructor takes a single `Options` object with the following properties:
 * - `endpoint`
 *   - the endpoint to listen on for WebSocket connections.
 *   - This must be a matcher as described by MockServiceWorker (https://mswjs.io/docs).
 *   - Defaults to `"*"` (matches all websocket connection requests)
 *
 * - `messageListeners`
 *   - a map of event names to functions that will be called when a message is received.
 *   - Defaults to an empty map.
 *
 * - `httpHandlers`
 *   - an array of handlers for HTTP requests
 *   - By default, http requests will be intercepted by a function that throws an error.
 *
 *
 * To use: create a new instance of a ChannelMock.
 * Then, within a beforeEach block in your test (or in your test setup file),
 * call channelMock.listen().
 *
 * ```typescript
 * // MyComponent.test.tsx
 * import { beforeEach } from "vitest"
 * import { ChannelMock, WS_ENDPOINT } from "./ChannelMock"
 *
 * const channelMock = new ChannelMock({})
 *
 * beforeEach(() => {
 *  channelMock.listen()
 * })
 *
 * describe("new Socket/2", () => {
 *  // ... run your tests ...
 * })
 * ```
 */
export class ChannelMock {
  public link: WebSocketLink
  private connectionHandlers: ConnectionHandlers = {
    onSocketConnect() {},
    onSocketClose() {},
  }
  public endpoint: string = "*"
  public channelListeners: ChannelListeners = new Map()

  private httpHandlers: Array<HttpHandler> = [
    http.all(this.endpoint, UNEXPECTED_HTTP_REQUEST),
  ]
  private wsHandler: WebSocketHandler
  private server: SetupServerApi

  constructor(options: Options) {
    if (options.endpoint) {
      this.endpoint = options.endpoint
    }
    if (options.channelListeners) {
      this.channelListeners = options.channelListeners
    }

    if (options.httpHandlers) {
      this.httpHandlers = options.httpHandlers
    }

    this.link = ws.link(this.endpoint)
    this.wsHandler = this.link.addEventListener("connection", (socket) => {
      this.__onSocketConnect(socket)

      socket.client.addEventListener("message", (message) =>
        this.__onMessage(socket, message),
      )
    })

    this.server = setupServer(...[this.wsHandler, ...this.httpHandlers])
  }

  public listen(): void {
    this.server.listen()
  }

  public onJoinChannel(channel: Topic, listener: MessageListener): void {
    this.onMessage(channel, "phx_join", listener)
  }

  public onMessage(
    channel: Topic,
    message: Event,
    listener: MessageListener,
  ): void {
    const channelListeners = this.channelListeners.get(channel) ?? new Map()
    channelListeners.set(message, listener)
    this.channelListeners.set(channel, channelListeners)
  }

  public onSocketConnect(
    callback: (req: WebSocketHandlerConnection) => void,
  ): void {
    this.connectionHandlers.onSocketConnect = callback
  }

  private __onSocketConnect(socket: WebSocketHandlerConnection) {
    this.connectionHandlers.onSocketConnect(socket)
  }

  private __onMessage(
    socket: WebSocketHandlerConnection,
    message: MessageEvent<WebSocketData>,
  ) {
    const data = JSON.parse(message.data as string)
    const [_messageRef, _joinRef, channel, event, payload] = data as [
      string | null,
      string | null,
      Topic,
      Event,
      Json,
    ]

    const channelListeners = this.channelListeners.get(channel) ?? new Map()
    const eventListener =
      channelListeners.get(event) ??
      this.noListenerRegistered(channel, event, payload)
    if (!eventListener) {
      throw new Error(`No listener for event ${event} on channel ${channel}`)
    }
    console.log("RECEIVED_PUSH", { channel, event, payload, channelListeners })
    eventListener(socket, payload)
  }

  private noListenerRegistered(topic: Topic, event: Event, payload: Json) {
    console.error(
      [
        `No listener registered for ${event} on channel ${topic}.`,
        "Received payload:",
        JSON.stringify(payload),
        "\n",
      ].join("\n"),
    )
  }
}
