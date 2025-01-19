import * as Phoenix from "phoenix"

export enum ChannelState {
  Closed = "closed",
  Errored = "errored",
  Joined = "joined",
  Joining = "joining",
  Leaving = "leaving",
}

export interface Channel extends Phoenix.Channel {
  joinPush: Phoenix.Push
  state: ChannelState
}
