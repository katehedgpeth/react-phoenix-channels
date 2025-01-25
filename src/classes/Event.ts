import { SocketEvents } from "./Socket"

export enum PhoenixMessages {
  Join = "phx_join",
  Error = "phx_error",
  Reply = "phx_reply",
  Close = "phx_close",
  Leave = "phx_leave",
  ChannelReply = "chan_reply",
}

export enum PushEvents {
  Send = "PUSH_SEND",
  Success = "PUSH_SUCCESS",
  Timeout = "PUSH_TIMEOUT",
  Error = "PUSH_ERROR",
}

export enum JoinEvents {
  Start = "JOIN_START",
  Success = "JOIN_SUCCESS",
  Error = "JOIN_ERROR",
  Timeout = "JOIN_TIMEOUT",
}

export enum MessageEvents {
  Receive = "MESSAGE_RECEIVE",
}

export interface Event {
  type: string
  topic: string
  message: string
  payload: object | undefined
}

export type Topic = string

export interface PushSend extends Event {
  type: PushEvents.Send
  payload: object
}

export interface PushReply extends Event {
  type: PushEvents.Success | PushEvents.Error | PushEvents.Timeout
}

export type PushEvent = PushSend | PushReply

export interface JoinStart extends Event {
  type: JoinEvents.Start
}
export interface JoinError extends Event {
  type: JoinEvents.Error
  payload: {
    reason: string
  }
}

export interface JoinSuccess extends Event {
  type: JoinEvents.Success
}

export interface JoinTimeout extends Event {
  type: JoinEvents.Timeout
}

export type JoinEvent = JoinStart | JoinSuccess | JoinError | JoinTimeout

export interface SocketEvent extends Event {
  type: SocketEvents
}

export type ChannelEvent = JoinEvent | PushEvent | SocketEvent

// export type PushEvent<
//   Message extends string = string,
//   Payload extends object = object,
//   Response extends object = object,
//   ErrorResponse extends object = object,
//   TimeoutResponse extends object = object,
// > =
//   | Event<PushEvents.Send, Message, Payload>
//   | Event<PushEvents.Success, Message, Response>
//   | Event<PushEvents.Error, Message, ErrorResponse>
//   | Event<PushEvents.Timeout, Message, TimeoutResponse>
//
// export type MessageEvent<
//   Message extends string = string,
//   Payload extends object = object,
// > = Event<MessageEvents.Receive, Message, Payload>
//
// export type JoinEvent<
//   Payload extends object = object,
//   Response extends object = object,
// > = PushEvent<PhoenixMessages.Join, Payload, Response>
//
// export type ChannelEvents<
//   PushEvents extends PushEvent,
//   MessageEvents extends MessageEvent,
// > = JoinEvent | PushEvents | MessageEvents
//
