import type { WebSocketClientConnection } from "@mswjs/interceptors/WebSocket"
import type { WebSocketHandler, WebSocketLink } from "msw"

export interface PhoenixMessage {
  joinRef: string | null
  ref: string | null
  topic: string
  message: string
  payload: object
}

type PhoenixResponse = object

export interface PhoenixBindingOptions {
  onConnect?: (client: WebSocketClientConnection) => void
  respondToPush(message: PhoenixMessage): PhoenixResponse | void
}

function handlePushMessage(
  event: MessageEvent,
  client: WebSocketClientConnection,
  { respondToPush }: PhoenixBindingOptions,
): void {
  const [joinRef, ref, topic, message, payload] = JSON.parse(event.data)
  const response = respondToPush({ ref, joinRef, topic, payload, message })
  if (response) {
    client.send(JSON.stringify([joinRef, ref, message, response]))
  }
}

export function toPhoenix(
  link: WebSocketLink,
  options: PhoenixBindingOptions,
): {
  handler: WebSocketHandler
  push: (message: PhoenixMessage) => void
  close: (code?: number, reason?: string) => void
} {
  let hoistedClient: WebSocketClientConnection
  const handler = link.addEventListener("connection", ({ client }) => {
    hoistedClient = client
    options.onConnect?.(client)
    client.addEventListener("message", (event) => {
      handlePushMessage(event, client, options)
    })
  })

  return {
    handler,
    push: (message) => hoistedClient?.send(JSON.stringify(message)),
    close: (code, reason) => hoistedClient?.close(code, reason),
  }
}
