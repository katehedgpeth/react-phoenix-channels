import { describe, expect, test } from "vitest"
import { Socket } from "./Socket"

describe("Socket.get", () => {
  test("opens a new socket connection", () => {
    const socket = Socket.get({ endpoint: "wss://example.com/socket" })
    expect(socket).toBeInstanceOf(Socket)
  })
})