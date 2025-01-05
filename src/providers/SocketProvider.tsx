import { type Context, type FC, type PropsWithChildren, createContext } from "react"
import { type Options, Socket } from "../classes/Socket"

export const SocketContext: Context<Socket | null> = createContext<Socket | null>(null)

type Props = PropsWithChildren<Options>

export const SocketProvider: FC<Props> = ({ children, ...options }) => {
  const socket = new Socket(options)

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  )
}