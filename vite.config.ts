import react from "@vitejs/plugin-react"
import { UserConfig, defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test_helpers/setup.ts",
  },
} as UserConfig)
