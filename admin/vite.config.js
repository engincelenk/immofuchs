import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // Dev-only: /api/* same-origin zum lokalen Worker (localhost:8787)
    // proxied, damit credentials:"include"-Requests ohne CORS-Config
    // funktionieren - identisches Muster wie im Kunden-Frontend (vite.config.js).
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  test: {
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
