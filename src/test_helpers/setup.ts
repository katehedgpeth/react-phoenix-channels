import { type WebSocketLink, ws } from "msw"
import { SetupServerApi, setupServer } from "msw/node"
import { type TestAPI, test } from "vitest"

interface Context {
  url: string
  link: WebSocketLink
  server: SetupServerApi
}

export const testWithServer: TestAPI<Context> = test.extend<Context>({
  url: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      use("ws://localhost:4000")
    },
    { auto: true },
  ],
  link: [
    async ({ url }, use) => {
      const link = ws.link(url + "/websocket")
      await use(link)
      link.clients.clear()
    },
    { auto: true },
  ],
  server: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const server: SetupServerApi = setupServer()
      // Start the worker before the test.
      server.events.on("request:start", ({ request }) => {
        console.log("MSW intercepted:", request.method, request.url)
      })
      server.listen()

      // Expose the worker object on the test's context.
      await use(server)
    },
    { auto: true },
  ],
})
