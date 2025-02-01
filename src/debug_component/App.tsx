import { type FC, useMemo } from "react";
import type { Options } from "../classes/Socket";
import { SocketProvider } from "../providers/SocketProvider";
import { ComponentWithChannel } from "./ComponentWithChannel";

const AUTH_TOKEN = localStorage.getItem("AUTH_TOKEN")

export const App: FC = function App() {
  const options: Options = useMemo(() => ({
    params: () => ({ token: AUTH_TOKEN, }),
    heartbeatIntervalMs: 2_000
  }), [])


  return (
    <SocketProvider url={"ws://localhost:4000/socket"} options={options}>
      <div>Debug react_phoenix_channels</div>
      <ComponentWithChannel />
    </SocketProvider>
  )
}