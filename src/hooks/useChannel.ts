import { useContext, useEffect, useMemo, useReducer, useRef } from "react"
import type { Channel } from "../classes"
import { ChannelStatus, SubscriberStatus } from "../classes/Channel"
import { SocketStatus } from "../classes/Socket"
import { SocketContext } from "../providers/SocketProvider"

interface Props<Events, State> {
  topic: string
  onEvent: (prevState: State, event: Events) => State
  initialState: State
}

interface Context<State> {
  state: State
  push: (message: string, payload: object) => void
  channelStatus: () => ChannelStatus
  socketStatus: () => SocketStatus
}

export function useChannel<Events, State>({
  topic,
  onEvent,
  initialState,
  ...options
}: Props<Events, State>): Context<State> {
  const socket = useContext(SocketContext)
  const channel = useRef<Channel>(socket.getOrCreateChannel(topic, options))
  const subscriberId = useRef(window.crypto.randomUUID())
  const topicRef = useRef(topic)
  topicRef.current = topic

  const [state, dispatch] = useReducer(onEvent, initialState)

  useEffect(() => {
    const unsubscribe = channel.current?.subscribe(
      subscriberId.current,
      dispatch,
    )

    console.log("CHANNEL_STATUS", channel.current.status)
    if (channel.current?.status === ChannelStatus.NotInitialized) {
      const join = channel.current.joinOnce()
      console.log("JOIN", join)
    }
    return () => {
      unsubscribe?.()
    }
  }, [])
  console.log("CHANNEL", channel.current)

  return useMemo(() => {
    return {
      state,
      push: (message: string, payload: object) => {
        if (!channel.current) {
          throw new Error(`${topicRef.current} channel is not initialized!`)
        }
        channel.current.push(message, payload)
      },
      socketStatus: () => {
        return socket.connectionStatus
      },
      channelStatus: () => {
        return channel.current.status
      },
      subscriptionStatus: (): SubscriberStatus => {
        return channel.current
          ? channel.current.subscriberStatus(subscriberId.current)
          : SubscriberStatus.Unsubscribed
      },
    }
  }, [state, socket])
}
