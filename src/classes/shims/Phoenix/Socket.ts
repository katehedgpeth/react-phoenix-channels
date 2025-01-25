import * as Phoenix from "phoenix"

export * as JoinError from "./Socket/JoinError"

export type Topic = string

export enum SocketMessages {
  Join = "phx_join",
  Error = "phx_error",
  Reply = "phx_reply",
  Close = "phx_close",
  Leave = "phx_leave",
}

export enum SocketStatus {
  Connecting = "connecting",
  Open = "open",
  Closing = "closing",
  Closed = "closed",
}

export interface Reply {
  message: SocketMessages.Reply
  payload: Error
}

export interface Socket extends Phoenix.Socket {
  conn: WebSocket | Phoenix.LongPoll | null
  channels: Phoenix.Channel[]
  channel(topic: Topic, params?: object, timeout?: number): Phoenix.Channel
  connectionState(): SocketStatus
  transportConnect(): void
}

export type WebSocketError = ErrorEvent
export type LongPollError = Response["status"] | "timeout"

export type SocketError = WebSocketError | LongPollError

export interface SocketConnectOption extends Phoenix.SocketConnectOption {
  logger(kind: string, msg: string, data: object): void
}

export type Message = Reply
