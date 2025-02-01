import type { SocketEvents } from "./Socket"

export enum PushEvents {
  Send = "PUSH_SEND",
  Success = "PUSH_SUCCESS",
  Timeout = "PUSH_TIMEOUT",
  Error = "PUSH_ERROR",
}

export enum HeartbeatEvents {
  Send = "HEARTBEAT_SEND",
  Reply = "HEARTBEAT_REPLY",
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

export interface SocketConnectionEvent extends Event {
  type: SocketEvents
}

type HeartbeatEvent =
  | {
      type: HeartbeatEvents.Send
      topic: string
      message: undefined
      payload: undefined
    }
  | {
      type: HeartbeatEvents.Reply
      topic: string
      message: undefined
      payload: {
        status: "ok" | "error"
      }
    }

export type JoinEvent = JoinStart | JoinSuccess | JoinError | JoinTimeout

export type ChannelEvent =
  | JoinEvent
  | PushEvent
  | SocketConnectionEvent
  | HeartbeatEvent
