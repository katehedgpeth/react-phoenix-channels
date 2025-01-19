import { Statuses } from "../Statuses"

export enum Reasons {
  UnmatchedTopic = "unmatched topic",
}

export interface UnmatchedTopic {
  reason: Reasons
}

export type Response = UnmatchedTopic

export interface JoinError {
  status: Statuses.Error
  response: Response
}
