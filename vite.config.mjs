import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
