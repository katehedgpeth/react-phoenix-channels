import { type FC } from "react"
import { type ConnectionEvent, useChannel } from "../hooks/useChannel"

interface State {
  events: Event[]
}

type Event = ConnectionEvent

function reducer(prevState: State, event: Event): State {
  return { ...prevState, events: [...prevState.events, event] }
}

export const ComponentWithChannel: FC = () => {
  const channel = useChannel<Event, State>({
    topic: `ai_summary:${12}`,
    onEvent: reducer,
    initialState: {
      events: []
    }
  })

  return (
    <div>
      <p>Socket state: {channel.socketStatus()}</p>
      <p>Channel state: {channel.channelStatus()}</p>

      {channel.state.events.map((ev, idx) => (
        <p key={idx}>{JSON.stringify(ev)}</p>
      ))}
    </div>
  )
}
