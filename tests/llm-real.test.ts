import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, expect, it } from "vitest";

// Проверяем запрос к провайдеру без сети: SDK ходит на локальный сервер-заглушку.
let server: http.Server;
let bodies: Record<string, unknown>[] = [];
let answers: unknown[] = [];

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      bodies.push(JSON.parse(raw));
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ id: "m", type: "message", role: "assistant", model: "x", stop_reason: "tool_use", stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: "tool_use", id: "t", name: "submit", input: answers.shift() }] }));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.LLM_MOCK = "false";
  process.env.LLM_API_KEY = "test-key";
});
afterAll(() => void server.close());

const good = { summary: "s", scores: [{ criterion: "c", score: 2, comment: "" }], mistakes: [], rights: [], next_steps: [] };

it("chatJson шлёт схему как tool, при невалидном ответе повторяет один раз", async () => {
  const { chatJson } = await import("@/lib/llm");
  const { reviewSchema } = await import("@/lib/review");
  answers = [{ summary: 1 }, good];
  const r = await chatJson([{ role: "user", content: "диалог" }], reviewSchema, { system: "sys" });
  expect(r.scores[0].score).toBe(2);
  expect(bodies).toHaveLength(2);
  expect(bodies[0]).toMatchObject({ tool_choice: { type: "tool", name: "submit" }, system: "sys" });
  expect((bodies[0].tools as { input_schema: { type: string } }[])[0].input_schema.type).toBe("object");
  expect(JSON.stringify(bodies[0])).not.toContain("$schema");
});

it("после двух невалидных ответов бросает ошибку", async () => {
  const { chatJson } = await import("@/lib/llm");
  const { reviewSchema } = await import("@/lib/review");
  answers = [{}, {}];
  await expect(chatJson([{ role: "user", content: "x" }], reviewSchema)).rejects.toThrow();
});
