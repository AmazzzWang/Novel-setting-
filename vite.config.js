import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 前端发到 /api 的请求,开发时代理到本地后端(server.js, 8787)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8787" },
  },
});
