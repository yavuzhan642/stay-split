import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // A zone with daylight saving time: date handling must not depend on the
    // machine running the tests, and DST transitions are where it usually breaks.
    env: { TZ: "America/New_York" },
  },
});
