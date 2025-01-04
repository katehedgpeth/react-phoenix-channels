import { SetupServerApi, setupServer } from "msw/node"
import { mocks } from "./mocks"


export const server: SetupServerApi = setupServer(...mocks)