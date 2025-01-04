import { describe, expect, test, vi } from "vitest"
import { WS_ENDPOINT } from "../test_helpers/mocks"
import { Channel } from "./Channel"
import { Socket } from "./Socket"

describe("new Socket/2", () => {
  test("opens a new socket connection", async () => {
    const onOpen = vi.fn()
    const socket = new Socket(WS_ENDPOINT, {})
    socket.onOpen(() => onOpen("OPENED!"))
    expect(socket).toBeInstanceOf(Socket)
    await vi.waitFor(() => {
      expect(socket.isConnected()).toBe(true)
    })
  })

  test("will open a second connection if one already open", async () => {
    const onOpen = vi.fn()
    const socket = new Socket(WS_ENDPOINT, {})
    socket.onOpen(() => onOpen("OPENED!"))
    expect(socket).toBeInstanceOf(Socket)
    await vi.waitFor(() => {
      expect(socket.isConnected()).toBe(true)
    })

    const onOpen2 = vi.fn()
    const socket2 = new Socket(WS_ENDPOINT)
    socket2.onOpen(() => onOpen2("OPENED!"))

    await vi.waitFor(() => {
      expect(socket2.isConnected()).toBe(true)
      expect(onOpen2).toHaveBeenCalledTimes(1)
    })

    expect(socket).not.toEqual(socket2)
  })
})

describe("Socket#channel/2", () => {
  test("opens a new channel", () => {
    const socket = new Socket(WS_ENDPOINT)
    const channel = socket.channel("new_channel", {})
    expect(channel).toBeInstanceOf(Channel)
    expect(channel.joinedOnce).toBe(true)

    const channel2 = socket.channel("new_channel2", {})
    expect(channel2).toBeInstanceOf(Channel)
    expect(channel2.joinedOnce).toBe(true)
  })

  test("does not open a second channel with the same topic", () => {
    const socket = new Socket(WS_ENDPOINT)
    const channel = socket.channel("new_channel", {})
    expect(channel).toBeDefined()

    const channel2 = socket.channel("new_channel", {})
    expect(channel2).toEqual(channel)
  })
})
