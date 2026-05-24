import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function replaceNodeEnvInBrowserBundle() {
  return {
    name: "replace-node-env-in-browser-bundle",
    renderChunk(code) {
      return code.replaceAll("process.env.NODE_ENV", JSON.stringify("production"));
    }
  };
}

export default defineConfig({
  plugins: [react(), replaceNodeEnvInBrowserBundle()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production")
  },
  build: {
    emptyOutDir: true,
    minify: "esbuild",
    lib: {
      entry: "src/react/floatingPlayerEntry.jsx",
      name: "NativePiPFloatingPlayerUI",
      formats: ["iife"],
      fileName: () => "floatingPlayerUI.global.js"
    },
    rollupOptions: {
      output: {
        extend: true
      }
    }
  }
});
