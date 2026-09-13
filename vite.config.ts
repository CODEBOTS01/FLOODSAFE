import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";


export default defineConfig({

  plugins: [
    react()
  ],


  server: {

    host: "0.0.0.0",

    allowedHosts: true,


    proxy: {

      "/api/sachet": {

        target:
          "https://sachet.ndma.gov.in",

        changeOrigin:
          true,

        secure:
          true,

        rewrite: () =>
          "/cap_public_website/FetchAllAlertDetails"

      }

    }

  },


  optimizeDeps: {

    exclude: [
      "maplibre-gl"
    ]

  }

});