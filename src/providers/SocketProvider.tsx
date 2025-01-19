import { type FC, type PropsWithChildren, type Context as ReactContext, createContext, useCallback, useEffect, useMemo, useRef } from "react"
import { useSyncExternalStore } from "use-sync-external-store/shim"
import { type Options, type Snapshot, Socket, SocketStatus } from "../classes/Socket"

interface Context {
  state: Snapshot
  getOrCreateChannel: Socket["getOrCreateChannel"]
  status: Socket["status"]
}

export const SocketContext: ReactContext<Context> = createContext({
  state: {
    channels: [],
    status: SocketStatus.NotInitialized,
    hasErrors: false,
    hasSubscribers: false,
    connectionStatus: SocketStatus.NotInitialized,
    isSubscribed: false
  },
  getOrCreateChannel: (_topic: string, _params: object) => {
    throw new Error("SocketProvider not initialized!")
  },
  status: () => {
    throw new Error("SocketProvider not initialized!")
  }
} as Context)

type Props = PropsWithChildren<Options & { url: string }>

export const SocketProvider: FC<Props> = ({ children, url, ...options }) => {
  const socket = useRef<Socket>(new Socket(url, options))
  const subscriberRef = useRef<string>(window.crypto.randomUUID())

  const snapshot = useRef<Snapshot>(socket.current.snapshot(subscriberRef.current))

  useEffect(() => {
    if (snapshot.current.connectionStatus === SocketStatus.NotInitialized) {
      socket.current.connect()
    }
  }, [])


  const subscribe = useCallback((cb: () => void) => {
    return socket.current.subscribeToChanges(subscriberRef.current, cb)
  }, [])

  const state = useSyncExternalStore<Snapshot>(subscribe, () => {
    snapshot.current = socket.current.snapshot(subscriberRef.current, snapshot.current)
    return snapshot.current
  })

  const context: Context = useMemo(() => {
    return {
      state,
      getOrCreateChannel: (topic, params) => {
        if (!socket.current) {
          throw new Error("socket not initialized!")
        }
        return socket.current.getOrCreateChannel(topic, params)
      },
      status: () => {
        if (!socket.current) {
          return SocketStatus.NotInitialized
        }
        return socket.current.status()
      }
    }
  }, [state])

  return (
    <SocketContext.Provider value={context}>
      {children}
    </SocketContext.Provider>
  )
}