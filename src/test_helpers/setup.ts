/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable no-empty-pattern */
import { type TestAPI, test } from "vitest"
import { Socket } from "../classes/Socket"
import { ChannelMock, WS_ENDPOINT } from "./ChannelMock"

export const testWithSocket: TestAPI<{ server: ChannelMock; socket: Socket }> =
  test.extend({
    socket: async ({}, use) => {
      const socket = new Socket(WS_ENDPOINT, {})
      await use(socket)
    },
    server: async ({}, use) => {
      const server = new ChannelMock({})
      server.listen()
      await use(server)
    },
  })
