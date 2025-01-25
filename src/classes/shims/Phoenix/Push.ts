import * as Phoenix from "phoenix"
import { type EventRef, type Reply, Statuses } from "."

interface HeartbeatPayload {
  status: Statuses
  response: object
}

export type HeartbeatPush = {
  topic: "phoenix"
  event: "heartbeat"
  ref: EventRef
  payload: object
}

export type HeartbeatReply = {
  topic: "phoenix"
  event: Reply
  joinRef: null
  payload: HeartbeatPayload
}

export interface Push extends Phoenix.Push {
  ref: EventRef
  event: string
  refEvent: string
  payload: object
  sent: boolean
}
