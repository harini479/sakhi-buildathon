import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  root: path.resolve(process.cwd(), "frontend"),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "frontend/src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    hmr: false,
  },
  build: {
    outDir: path.resolve(process.cwd(), "frontend/dist"),
    emptyOutDir: true,
  },
});
