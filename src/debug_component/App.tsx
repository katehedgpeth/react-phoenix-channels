import { type FC, useMemo } from "react";
import { SocketProvider } from "../providers/SocketProvider";
import { ComponentWithChannel } from "./ComponentWithChannel";

const AUTH_TOKEN = localStorage.getItem("AUTH_TOKEN")

export const App: FC = function App() {
  const params = useMemo(() => ({ token: AUTH_TOKEN }), [])
  return (
    <SocketProvider url={"ws://localhost:4000/socket"} params={params}>
      <div>Debug react_phoenix_channels</div>
      <ComponentWithChannel />
    </SocketProvider>
  )
}