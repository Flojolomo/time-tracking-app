import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.execute-api\..*\.amazonaws\.com\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Time Tracker',
        short_name: 'TimeTracker',
        description: 'Track your time, boost productivity',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    cors: true,
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**']
    },
    hmr: true
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      input: {
        main: "./index.html",
      },
    },
  },
  define: {
    global: "globalThis",
    "process.env": {},
  },
  resolve: {
    alias: {
      "./runtimeConfig": "./runtimeConfig.browser",
    },
  },
  optimizeDeps: {
    include: ["aws-amplify"],
    exclude: ["@aws-amplify/ui-react"],
  },
  publicDir: "public",
});
