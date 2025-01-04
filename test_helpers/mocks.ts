import { HttpHandler, WebSocketHandler, http, ws } from "msw"

export const WS_ENDPOINT = "wss://localhost:4000"

const channel = ws.link(`${WS_ENDPOINT}/websocket`)

export const mocks: Array<WebSocketHandler | HttpHandler> = [
  channel.addEventListener("connection", (req) => {
    req.client.addEventListener("message", () => {
      req.client.send("ok")
    })

    // req.client.send("ok")
  }),
  http.all("*", (req) => {
    throw new Error(`Received unexpected HTTP request: ${req.request.url}`)
  }) as HttpHandler,
]
