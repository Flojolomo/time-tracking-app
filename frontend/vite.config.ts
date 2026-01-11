import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    cors: true,
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**'] // make sure build output is ignored
    },
    // strictPort: true, // fail if port is already in use
    hmr: false
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
