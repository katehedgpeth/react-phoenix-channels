import {
  type FC,
  type PropsWithChildren,
  type Context as ReactContext,
  createContext,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"
import { type Options, Socket, SocketStatus } from "../classes/Socket"

interface Context {
  connectionStatus: Socket["connectionStatus"]
  getOrCreateChannel: Socket["getOrCreateChannel"]
  subscribe: (cb: () => void) => void
}

export const SocketContext: ReactContext<Context> = createContext({
  connectionStatus: SocketStatus.NotInitialized,
  getOrCreateChannel: (_topic: string, _params: object) => {
    throw new Error("SocketProvider not initialized!")
  },
  subscribe: () => {
    throw new Error("SocketProvider not initialized!")
  },
} as Context)

type Props = PropsWithChildren<Options & { url: string }>

export const SocketProvider: FC<Props> = memo(function SocketProvider({ children, url, ...options }: Props) {
  const socket = useRef<Socket>(new Socket(url, options))
  const subscriberRef = useRef<string>(window.crypto.randomUUID())

  const [connectionStatus, setConnectionStatus] = useState(socket.current.connectionStatus)

  socket.current.subscribeToChanges(subscriberRef.current, () => {
    setConnectionStatus(socket.current.connectionStatus)
  })

  useEffect(() => {
    if (socket.current.connectionStatus !== SocketStatus.NotInitialized) {
      throw new Error("Socket already initialized!")
    }
    const disconnect = socket.current.connect()
    return () => {
      console.error("SocketProvider unmounted. Disconnecting socket.")
      disconnect()
    }
  }, [])


  useEffect(() => {
    if (url !== socket.current.url) {
      console.error(`
        Socket URL changed from ${socket.current.url} to ${url}.
        ReactPhoenixChannels expects the socket URL not to change.
        This change will be ignored and the socket will continue to
        use the URL passed at initialization. (${socket.current.url})
        `)
    }
  }, [url])

  useEffect(() => {
    const hasChanged = Object.keys(options).some((key) => {
      return options[key as keyof Options] !== socket.current.options[key as keyof Options]
    })
    if (hasChanged) {
      console.error(`
        Ignoring unexpected Socket options change:
        initial: ${JSON.stringify(socket.current.options)}
        updated options: ${JSON.stringify(options)}.

        ReactPhoenixChannels expects the socket options to be memoized.
        This change will be ignored and the socket will continue to
        use the options passed at initialization.
        `)
    }
  }, [options])

  const context: Context = useMemo(() => {
    return {
      connectionStatus,
      getOrCreateChannel: (topic, params) => {
        if (!socket.current) {
          throw new Error("socket not initialized!")
        }
        return socket.current.getOrCreateChannel(topic, params)
      },
      subscribe: (cb: () => void) => {
        return socket.current.subscribeToChanges(subscriberRef.current, cb)
      },
    }
  }, [connectionStatus])

  return (
    <SocketContext.Provider value={context}>
      {children}
    </SocketContext.Provider>
  )
})