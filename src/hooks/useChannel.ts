import { useContext, useEffect, useMemo, useReducer, useRef } from "react"
import type { Channel } from "../classes"
import {
  type ChannelEvent,
  ChannelStatus,
  SubscriberStatus,
} from "../classes/Channel"
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

export type ConnectionEvent = ChannelEvent

export function useChannel<Events, State>({
  topic,
  onEvent,
  initialState,
  ...options
}: Props<Events, State>): Context<State> {
  const socket = useContext(SocketContext)
  const channel = useRef<Channel | null>(
    socket.getOrCreateChannel(topic, options),
  )
  const subscriberId = useRef(window.crypto.randomUUID())
  const topicRef = useRef(topic)
  topicRef.current = topic

  const [state, dispatch] = useReducer(onEvent, initialState)

  channel.current?.subscribe(subscriberId.current, dispatch)

  useEffect(() => {
    const current = {
      channel: channel.current,
      subscriberId: subscriberId.current,
    }
    return () => {
      current.channel?.unsubscribe(current.subscriberId)
    }
  }, [])

  // useEffect(() => {
  //   console.log({
  //     topic: topicRef.current,
  //     options,
  //     socket,
  //     channel: channel.current,
  //   })
  //   if (!channel.current) {
  //     throw new Error(`${topicRef.current} channel is not initialized!`)
  //   }
  //   const unsubscribe = channel.current.subscribe(
  //     subscriberId.current,
  //     dispatch,
  //   )
  //   return () => {
  //     unsubscribe()
  //     channel.current = null
  //   }
  // }, [options, socket])

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
        return socket.status()
      },
      channelStatus: () => {
        return channel.current
          ? channel.current.channelStatus()
          : ChannelStatus.NotInitialized
      },
      subscriptionStatus: (): SubscriberStatus => {
        return channel.current
          ? channel.current.subscriberStatus(subscriberId.current)
          : SubscriberStatus.Unsubscribed
      },
    }
  }, [state, socket])
}
