import * as Phoenix from "phoenix"
import { type EventRef } from "."

export interface Push extends Phoenix.Push {
  ref: EventRef
  event: string
  refEvent: string
  payload: object
  sent: boolean
}
