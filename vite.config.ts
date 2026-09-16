import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    // Proxy /api requests to the SOS Express backend during development.
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      // Proxy /ffgs-api to the Python FastAPI read layer (ml-pipeline/src/api/main.py)
      "/ffgs-api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ffgs-api/, ""),
      },
    },
  },

  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
});
