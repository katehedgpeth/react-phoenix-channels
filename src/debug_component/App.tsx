import { type FC } from "react";
import { SocketProvider } from "../providers/SocketProvider";
import { ComponentWithChannel } from "./ComponentWithChannel";

const AUTH_TOKEN = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJ2ZXRzcGlyZSIsImV4cCI6MTczNjcwNTkyMiwiaWF0IjoxNzM2MTAxMTIyLCJpc3MiOiJ2ZXRzcGlyZSIsImp0aSI6IjRkNWZmYzQzLWFiMjMtNDZlMS05MmI2LTI1ZjlmYzIyNWMwNSIsIm5iZiI6MTczNjEwMTEyMSwicHJvdmlkZXIiOnsiaWQiOjQ2LCJpc19vcmdfYWRtaW4iOnRydWUsImlzX3ZldGVyaW5hcmlhbiI6dHJ1ZSwib3JnX2lkIjoxMn0sInN1YiI6IlByb3ZpZGVyOjQ2Iiwic3VwcG9ydF91c2VyIjpudWxsLCJ0eXAiOiJ0b2tlbiJ9.Ac42O8nkL8bvegwJA3KqWP6Mv6XM0pQMFafRPgkdqzT29pGt4J9gbJ1iBnwgSXeSZfwEnqbAu4JtZvissqMriw"

export const App: FC = function App() {
  return (
    <SocketProvider endpoint={"ws://localhost:4000/socket"} params={{ token: AUTH_TOKEN }}>
      <div>Debug react_phoenix_channels</div>
      <ComponentWithChannel />
    </SocketProvider>
  )
}