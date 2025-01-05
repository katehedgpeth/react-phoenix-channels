import { render } from "@testing-library/react"
import { describe, expect, vi } from "vitest"
import { SocketContext } from "../providers/SocketProvider"
import { testWithSocket } from "../test_helpers/setup"
import { useChannel } from "./useChannel"


describe("useChannel", () => {


  testWithSocket("Opens a new channel and listens for its messages", async ({ server, socket }) => {
    function Component() {
      const messages = useChannel<{ result: string }>({
        topic: "new_channel",
        params: {},
        subscribe: (state) => state,
      })

      return <div>
        <h1>Messages</h1>
        {messages.result && <div>RESULT: {messages.result}</div>}
      </div>
    }

    const onJoinChannel = vi.fn()

    server.onJoinChannel("new_channel", (socket, payload) => {
      onJoinChannel("new_channel", payload)
      // socket.client.send("result", { result: "message" })
    })
    server.onMessage("new_channel", "result", () => { })

    const screen = render(<SocketContext.Provider value={socket}><Component /></SocketContext.Provider>)
    await vi.waitUntil(() => screen.getByRole("heading", { name: "Messages" }))
    expect(screen.queryByText("RESULT:", { exact: false })).toBeNull()

    await vi.waitFor(() => {
      expect(onJoinChannel).toHaveBeenCalledTimes(2)
    })

    // const channel = socket.channel<{ result: string }>("new_channel", { params: {} })
    // channel.push("message", {})
    // await vi.waitUntil(() => screen.getByText("RESULT: message"))

  })
})
