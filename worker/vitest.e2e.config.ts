import { defineConfig } from "vitest/config";

// Eigene Config statt eines zweiten Include-Patterns in vitest.config.ts:
// diese Tests brauchen laengere Timeouts (echte Netzwerk-Calls gegen den
// deployten dev-Worker + Paddle-Sandbox) und sollen niemals versehentlich
// vom normalen `vitest`/`vitest watch` mitgenommen werden.
export default defineConfig({
  test: {
    include: ["e2e/**/*.e2e.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
