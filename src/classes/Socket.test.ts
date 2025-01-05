import { describe, expect, vi } from "vitest"
import { WS_ENDPOINT } from "../test_helpers/ChannelMock"
import { testWithSocket } from "../test_helpers/setup"
import { Channel } from "./Channel"
import { Socket } from "./Socket"

describe("new Socket/2", () => {
  testWithSocket("opens a new socket connection", async ({ socket }) => {
    const onOpen = vi.fn()
    socket.onOpen(() => onOpen("OPENED!"))
    expect(socket).toBeInstanceOf(Socket)
    await vi.waitFor(() => {
      expect(socket.isConnected()).toBe(true)
    })
  })

  testWithSocket(
    "will open a second connection if one already open",
    async ({ socket }) => {
      const onOpen = vi.fn()
      socket.onOpen(() => onOpen("OPENED!"))
      expect(socket).toBeInstanceOf(Socket)
      await vi.waitFor(() => {
        expect(socket.isConnected()).toBe(true)
      })

      const onOpen2 = vi.fn()
      const socket2 = new Socket({ endpoint: WS_ENDPOINT })
      socket2.onOpen(() => onOpen2("OPENED!"))

      await vi.waitFor(() => {
        expect(socket2.isConnected()).toBe(true)
        expect(onOpen2).toHaveBeenCalledTimes(1)
      })

      expect(socket).not.toEqual(socket2)
    },
  )
})

describe("Socket#channel/2", () => {
  testWithSocket("opens a new channel", ({ socket }) => {
    const channel = socket.channel("new_channel", { params: {} })
    expect(channel).toBeInstanceOf(Channel)
    expect(channel.joinedOnce).toBe(true)

    const channel2 = socket.channel("new_channel2", { params: {} })
    expect(channel2).toBeInstanceOf(Channel)
    expect(channel2.joinedOnce).toBe(true)
  })

  testWithSocket(
    "does not open a second channel with the same topic",
    ({ socket }) => {
      const channel = socket.channel("new_channel", { params: {} })
      expect(channel).toBeDefined()

      const channel2 = socket.channel("new_channel", { params: {} })
      expect(channel2).toEqual(channel)
    },
  )
})
