import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // Component tests for the EPIC-03/04 booking module. The pure slot logic in
  // src/lib/slots.js is covered separately by `npm test`, which needs no
  // dependencies at all; vitest is only here for behaviour that genuinely needs
  // a render and a clock, such as the hold countdown.
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.jsx"],
    setupFiles: ["./src/test-setup.js"],
  },
});
