import { type FC, useEffect, useRef } from "react"
import { type ChannelEvent, HeartbeatEvents, PushEvents } from "../classes/Event"
import { useChannel } from "../hooks/useChannel"

interface State {
  lastEvent: ChannelEvent | null
  heartbeatStatus: "awaiting" | "ok" | "error" | null
}


function parseEvent(event: ChannelEvent): Partial<State> | undefined {
  switch (event.type) {

    case PushEvents.Send:
      return { heartbeatStatus: "awaiting" }

    case PushEvents.Success:
      return { heartbeatStatus: "ok" }

    case HeartbeatEvents.Send:
    case HeartbeatEvents.Reply:
      return

    default:
      console.error("Unknown event", event)

  }
}

function reducer(prevState: State, event: ChannelEvent): State {
  const newState = parseEvent(event)
  return newState ? { ...prevState, ...newState, lastEvent: event } : prevState
}

export const ComponentWithChannel: FC = () => {
  const channel = useChannel<ChannelEvent, State>({
    topic: `room:${12}`,
    onEvent: reducer,
    initialState: {
      lastEvent: null,
      heartbeatStatus: null
    }
  })

  const interval = useRef<number | null>(null)

  useEffect(() => {
    if (!interval.current) {
      interval.current = window.setInterval(() => {
        channel.push("ping", { message: "Hello" })
      }, 3000)

    }
  }, [channel])

  useEffect(() => {
    return () => {
      if (interval.current) {
        window.clearInterval(interval.current)
      }
    }
  }, [])


  return (
    <div>
      <p>Socket state: {channel.socketStatus()}</p>
      <p>Channel state: {channel.channelStatus()}</p>
      <div className="heartbeat-container">
        <div className={`heartbeat ${channel.state.heartbeatStatus}`}></div>
      </div>
      <button onClick={() => {
        channel.push("ping", { message: "Hello" })
      }}>Push message</button>


      <p>Last event: {JSON.stringify(channel.state.lastEvent)}</p>
    </div>
  )
}
