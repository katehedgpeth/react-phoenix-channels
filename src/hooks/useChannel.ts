import { useContext } from "react"
import type { Options as ChannelOptions } from "../classes/Channel"
import { SocketContext } from "../providers/SocketProvider"
import { useStore } from "../shims/zustand/useStore"

interface Options<T> extends Omit<ChannelOptions, "socket"> {
  topic: string
  subscribe: (state: T) => T
}

export function useChannel<T>({ topic, subscribe, ...options }: Options<T>): T {
  const socket = useContext(SocketContext)
  if (!socket) {
    throw new Error("useChannel must be used within a SocketProvider")
  }

  const channel = socket.channel<T>(topic, options)

  const store = useStore<T, T>(channel.messages, subscribe)

  return store
}
