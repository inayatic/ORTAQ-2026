import { defineConfig } from "vitest/config";
import path from "node:path";

// Прогон с реальной моделью: npm run eval. Ключ и модель берутся из .env.local или окружения.
export default defineConfig({
  test: { include: ["evals/**/*.eval.ts"], env: { DB_PATH: ":memory:" }, testTimeout: 600_000, hookTimeout: 60_000, fileParallelism: false },
  resolve: { alias: { "@": path.resolve(__dirname) } },
});
