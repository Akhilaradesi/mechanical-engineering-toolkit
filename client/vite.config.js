import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/health": "http://localhost:4000",
      "/materials": "http://localhost:4000",
      "/calculate": "http://localhost:4000",
      "/save": "http://localhost:4000",
      "/history": "http://localhost:4000"
    }
  }
});
