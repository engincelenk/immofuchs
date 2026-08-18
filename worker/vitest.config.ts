import { defineConfig } from "vitest/config";

// e2e/ laeuft NICHT hier mit - die Tests dort brauchen echte Session-IDs
// (Env-Variablen) und einen erreichbaren, echten Worker, wuerden also den
// normalen `npm test`/CI-Lauf ohne Netzwerk/Secrets zum Scheitern bringen.
// Separater Lauf: `npm run test:e2e` (vitest.e2e.config.ts).
export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/.{idea,git,cache,output,temp}/**", "e2e/**"],
  },
});
