import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  define: {
    // Polyfill global for libraries like SockJS (some envs need this at build time)
    global: 'window',
  },
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
      ? [
        await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer(),
        ),
        await import("@replit/vite-plugin-dev-banner").then((m) =>
          m.devBanner(),
        ),
      ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 5731,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    // Proxy API requests to Java microservices gateway to avoid CORS issues
    proxy: {
      "/api": {
        target: "http://129.212.246.236:9002",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: "http://129.212.246.236:9002",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
