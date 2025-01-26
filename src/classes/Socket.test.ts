import { waitFor } from "@testing-library/react"
import { describe, expect, vi } from "vitest"
import { toPhoenix } from "../test_helpers/PhoenixBinding"
import { testWithServer } from "../test_helpers/setup"
import {
  type Options,
  Socket,
  type SocketAbnormalCloseEvent,
  SocketCloseCodes,
  type SocketClosingEvent,
  type SocketConnectingEvent,
  type SocketEvent,
  SocketEvents,
  type SocketNormalCloseEvent,
  type SocketOpenEvent,
  SocketStatus,
} from "./Socket"

describe("Socket", () => {
  testWithServer(
    "new Socket/2 opens a new socket connection",
    async ({ url, link, server }) => {
      const pushListener = vi.fn()
      const { handler } = toPhoenix(link, {
        respondToPush: (message) => {
          pushListener(message)
        },
      })
      server.use(handler)
      const socket = new Socket(url, {
        reconnectAfterMs: () => 10000,
      })
      expect(socket.connectionStatus).toBe(SocketStatus.NotInitialized)
      const listener = vi.fn()
      const id = "ID"
      socket.subscribe(id, listener)
      socket.connect()
      await waitFor(() => {
        expect(listener).toHaveBeenCalledTimes(1)
        expect(socket.connectionStatus).toBe(SocketStatus.Connecting)
      })

      await waitFor(() => {
        expect(listener).toHaveBeenCalledTimes(2)
        expect(socket.connectionStatus).toBe(SocketStatus.Open)
      })

      const calls = listener.mock.calls as [
        [SocketConnectingEvent],
        [SocketOpenEvent],
      ]
      expect(calls.length).toBe(2)
      const [[connecting], [open]] = calls

      expect(connecting.event).toBe(SocketEvents.Connecting)
      expect(connecting.payload).toBeUndefined()

      expect(open.event).toBe(SocketEvents.Open)
      expect(open.payload).toBeUndefined()
    },
  )

  testWithServer(
    "socket notifies subscribers when connection is closed normally via disconnect/0",
    async ({ url, link, server }) => {
      const pushListener = vi.fn()
      const { handler } = toPhoenix(link, {
        respondToPush: (message) => {
          pushListener(message)
        },
      })

      server.use(handler)
      const options: Options = {
        reconnectAfterMs: () => 0,
      }
      const socketDispatch = vi.fn()
      const socket = new Socket(url, options)
      socket.subscribe("ID", socketDispatch)
      socket.connect()

      await waitFor(() => {
        expect(socket.connectionStatus).toBe(SocketStatus.Open)
      })

      socket.disconnect()
      await waitFor(() => {
        expect(socket.connectionStatus).toBe(SocketStatus.Closing)
        expect(socketDispatch).toHaveBeenCalledTimes(3)
      })

      await waitFor(() => {
        expect(socket.connectionStatus).toBe(SocketStatus.Closed)
        expect(socketDispatch).toHaveBeenCalledTimes(4)
      })

      const calls: Array<Array<SocketEvent>> = socketDispatch.mock.calls
      const [_connecting, _open, [closing], [closed]] = calls as [
        [SocketConnectingEvent],
        [SocketOpenEvent],
        [SocketClosingEvent],
        [SocketNormalCloseEvent],
      ]

      expect(closing.event).toBe(SocketEvents.Closing)
      expect(closing.payload).toBeUndefined()

      expect(closed.event).toBe(SocketEvents.NormalClose)
      expect(closed.payload.event).toBeInstanceOf(Event)
      expect(closed.payload.code).toEqual(SocketCloseCodes.Normal)
      expect(closed.payload.reason).toBe("Normal")
      expect(socket.connectionStatus).toBe(SocketStatus.Closed)
    },
  )

  testWithServer(
    "socket notifies subscribers of unexpected socket close",
    async ({ url, link, server }) => {
      const { handler, close } = toPhoenix(link, {
        respondToPush: () => {},
      })

      server.use(handler)

      const options: Options = {
        reconnectAfterMs: () => 100,
      }
      const socketDispatch = vi.fn()
      const socket = new Socket(url, options)
      socket.subscribe("ID", socketDispatch)
      socket.connect()

      await waitFor(() => {
        expect(socket.connectionStatus).toBe(SocketStatus.Open)
      })

      close(SocketCloseCodes.Abnormal, "Abnormal")

      await waitFor(() => {
        expect(socket.connectionStatus).toBe(SocketStatus.ConnectionLost)
        expect(socket.errors).toHaveLength(1)
      })

      await waitFor(() => {
        expect(socket.connectionStatus).toBe(SocketStatus.Open)
      })
      expect(socketDispatch).toHaveBeenCalledTimes(5)

      const [, , [errorEvent], [reconnecting], [open]] = socketDispatch.mock
        .calls as [
        [SocketConnectingEvent],
        [SocketOpenEvent],
        [SocketAbnormalCloseEvent],
        [SocketConnectingEvent],
        [SocketOpenEvent],
      ]

      expect(errorEvent.event).toBe(SocketEvents.AbnormalClose)
      expect(errorEvent.payload.reason).toEqual("Abnormal")
      expect(errorEvent.payload.code).toBe(SocketCloseCodes.Abnormal)
      expect(errorEvent.payload.event).toBeInstanceOf(Event)
      expect(errorEvent.payload.event.code).toBe(SocketCloseCodes.Abnormal)
      expect(errorEvent.payload.event.reason).toBe("Abnormal")

      expect(reconnecting.event).toBe(SocketEvents.Connecting)
      expect(open.event).toBe(SocketEvents.Open)
    },
  )
})
