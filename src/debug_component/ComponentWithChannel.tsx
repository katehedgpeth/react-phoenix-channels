import { type FC, useState } from "react"
import { useChannel } from "../hooks/useChannel"

interface Messages {
  result: string
}

interface State {
  socketState: "open" | "closed" | "error"
  socketError?: any
  channelState?: "joined" | "closed" | "error" | "timeout"
}

export const ComponentWithChannel: FC = () => {
  const [state, setState] = useState<State>({ socketState: "closed" })
  const messages = useChannel<Messages>({
    topic: `ai_summary:${12}`,
    subscribe: (s) => s,
    params: {},
    callbacks: {
      onSocketOpen: () => {
        setState((s) => ({ ...s, socketState: "open" }))
      },
      onJoinSuccess: () => {
        setState((s) => ({ ...s, channelState: "joined" }))
      },
      onJoinError: () => {
        setState((s) => ({ ...s, channelState: "error" }))
      },
      onJoinTimeout: () => {
        setState((s) => ({ ...s, channelState: "timeout" }))
      },
    },
  })

  return (
    <div>
      <p>Socket state: {state.socketState}</p>
      <p>Channel state: {state.channelState}</p>

      {Object.keys(messages).map((k) => (
        <p key={k}>{k}</p>
      ))}
    </div>
  )
}
