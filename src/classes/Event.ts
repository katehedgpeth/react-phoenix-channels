import { Events as SocketEvents } from "./Socket"

export enum PhoenixMessages {
  Join = "phx_join",
  Error = "phx_error",
  Reply = "phx_reply",
  Close = "phx_close",
  Leave = "phx_leave",
  ChannelReply = "chan_reply",
}

export enum PushEvents {
  Send = "SEND",
  Success = "SUCCESS",
  Timeout = "TIMEOUT",
  Error = "ERROR",
}

export enum JoinEvents {
  Start = "START_JOIN",
  Success = "JOIN_SUCCESS",
  Error = "JOIN_ERROR",
  Timeout = "JOIN_TIMEOUT",
}

export enum MessageEvents {
  Receive = "RECEIVE_MESSAGE",
}

export interface Event<
  Type extends PushEvents | MessageEvents | JoinEvents | SocketEvents =
    | PushEvents
    | MessageEvents
    | JoinEvents
    | SocketEvents,
  Message extends string = string,
  Payload extends object | undefined = object,
> {
  type: Type
  topic: string
  message: Message
  payload: Payload
}

export type PushEvent<
  Message extends string = string,
  Payload extends object = object,
  Response extends object = object,
  ErrorResponse extends object = object,
  TimeoutResponse extends object = object,
> =
  | Event<PushEvents.Send, Message, Payload>
  | Event<PushEvents.Success, Message, Response>
  | Event<PushEvents.Error, Message, ErrorResponse>
  | Event<PushEvents.Timeout, Message, TimeoutResponse>

export type MessageEvent<
  Message extends string = string,
  Payload extends object = object,
> = Event<MessageEvents.Receive, Message, Payload>

export type JoinEvent<
  Payload extends object = object,
  Response extends object = object,
> = PushEvent<PhoenixMessages.Join, Payload, Response>

export type ChannelEvents<
  PushEvents extends PushEvent,
  MessageEvents extends MessageEvent,
> = JoinEvent | PushEvents | MessageEvents
