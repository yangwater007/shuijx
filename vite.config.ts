/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@infra": path.resolve(__dirname, "src/0-infra"),
      "@data": path.resolve(__dirname, "src/1-data"),
      "@service": path.resolve(__dirname, "src/2-service"),
      "@business": path.resolve(__dirname, "src/3-business"),
      "@ui": path.resolve(__dirname, "src/4-presentation"),
    },
  },
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api/quicktiny": { target: "https://stock.quicktiny.cn", changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/quicktiny/, "/api"), headers: { Referer: "https://stock.quicktiny.cn/" } },
      "/api/bridge": { target: "http://localhost:8765", changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/bridge/, "") },
      "/api/mcp": { target: "https://qzqpymvboltyvddpmpct.supabase.co", changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/mcp/, "/functions/v1/mcp") },
    },
  },
  test: { globals: true, environment: "jsdom", setupFiles: [] },
});
