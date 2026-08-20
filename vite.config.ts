import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  publicDir: "static",
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["e2e/**"],
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
  },
  build: {
    outDir: "public",
    emptyOutDir: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@mui") || id.includes("node_modules/@emotion")) return "mui";
          if (id.includes("node_modules/yaml")) return "yaml";
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
