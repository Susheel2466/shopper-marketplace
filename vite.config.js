import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: "build", // keep CRA's output dir so existing scripts/docs still apply
  },
  test: {
    globals: true, // describe/test/expect/vi available without imports
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    css: true,
    // Only the frontend src — the backend has its own (Jest) test runner.
    include: ["src/**/*.{test,spec}.{js,jsx}"],
  },
});
