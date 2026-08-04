import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function swVersionPlugin() {
  return {
    name: "sw-version",
    closeBundle() {
      const swPath = path.resolve(__dirname, "dist/sw.js");
      if (fs.existsSync(swPath)) {
        const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "package.json"), "utf-8"));
        const version = `${pkg.version}-${Date.now()}`;
        const content = fs.readFileSync(swPath, "utf-8");
        fs.writeFileSync(swPath, content.replace("__BUILD_VERSION__", version));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), swVersionPlugin()],
  server: {
    // Dev-only: /api/* same-origin zum lokalen Worker (localhost:8787)
    // proxied, damit credentials:"include"-Requests ohne CORS-Config
    // funktionieren. Betrifft nur `vite dev`, kein Einfluss auf `vite build`.
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
