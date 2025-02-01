import {
  type FC,
  type PropsWithChildren,
  type Context as ReactContext,
  createContext,
  memo,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react"
import { type Options, Socket, type SocketAbnormalCloseEvent, type SocketErrorEvent, type SocketEvent, SocketEvents, SocketStatus } from "../classes/Socket"

interface Context {
  connectionStatus: Socket["connectionStatus"]
  getOrCreateChannel: Socket["getOrCreateChannel"]
}

export const SocketContext: ReactContext<Context> = createContext({
  connectionStatus: SocketStatus.NotInitialized,
  getOrCreateChannel: (_topic: string, _params: object) => {
    throw new Error("SocketProvider not initialized!")
  },
} as Context)

type Props = PropsWithChildren<{ url: string, options: Options }>

interface State {
  connectionStatus: SocketStatus
  error: SocketErrorEvent["payload"] | SocketAbnormalCloseEvent["payload"] | null
}

function parseSocketError({ event, payload }: SocketEvent): State["error"] {
  switch (event) {
    case SocketEvents.Error:
    case SocketEvents.AbnormalClose:
      return payload
    default:
      return null
  }
}

function reducer(state: State, { event, payload }: SocketEvent, socket: Socket): State {
  return {
    ...state,
    connectionStatus: socket.connectionStatus,
    error: parseSocketError({ event, payload } as SocketEvent)
  }
}

export const SocketProvider: FC<Props> = memo(function SocketProvider({ children, url, options }: Props) {
  const socket = useRef<Socket>(new Socket(url, options))
  const subscriberRef = useRef<string>(window.crypto.randomUUID())

  const [state, dispatch] = useReducer<State, [SocketEvent]>((state, event) => reducer(state, event, socket.current), { connectionStatus: socket.current.connectionStatus, error: null })

  socket.current.subscribe(subscriberRef.current, dispatch)

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
      ...state,
      getOrCreateChannel: (topic, params) => {
        if (!socket.current) {
          throw new Error("socket not initialized!")
        }
        return socket.current.getOrCreateChannel(topic, params)
      },
    }
  }, [state])

  return (
    <SocketContext.Provider value={context}>
      {children}
    </SocketContext.Provider>
  )
})