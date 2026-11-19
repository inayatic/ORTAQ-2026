import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], env: { DB_PATH: ":memory:", LLM_MOCK: "true" } },
  resolve: { alias: { "@": path.resolve(__dirname) } },
});
