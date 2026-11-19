import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";

// Проверяем запросы к провайдеру без сети: SDK ходит на локальный сервер-заглушку.
let server: http.Server;
let bodies: Record<string, unknown>[] = [];
let answers: { status?: number; text?: string }[] = [];

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      bodies.push(JSON.parse(raw));
      const a = answers.shift() ?? { text: "{}" };
      res.statusCode = a.status ?? 200;
      res.setHeader("content-type", "application/json");
      res.end(
        a.status
          ? JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "unsupported" } })
          : JSON.stringify({ id: "m", type: "message", role: "assistant", model: "x", stop_reason: "end_turn", stop_sequence: null,
              usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: "text", text: a.text }] }),
      );
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.LLM_MOCK = "false";
  process.env.LLM_API_KEY = "test-key";
});
afterAll(() => void server.close());
beforeEach(() => (bodies = []));

const good = JSON.stringify({ summary: "s", scores: [{ criterion: "c", score: 2, comment: "" }], mistakes: [], rights: [], next_steps: [] });
const run = async () => {
  const { chatJson } = await import("@/lib/llm");
  const { reviewSchema } = await import("@/lib/review");
  return chatJson([{ role: "user", content: "диалог" }], reviewSchema, { system: "sys" });
};

it("шлёт JSON-схему без неподдерживаемых ключей и повторяет при невалидном ответе", async () => {
  answers = [{ text: '{"summary": 1}' }, { text: good }];
  expect((await run()).scores[0].score).toBe(2);
  expect(bodies).toHaveLength(2);
  const body = JSON.stringify(bodies[0]);
  expect((bodies[0].output_config as { format: { type: string } }).format.type).toBe("json_schema");
  expect(body).not.toMatch(/\$schema|"minimum"|"maximum"/);
  expect(body).not.toContain("tool_choice");
});

it("при отказе 400 переходит на JSON в тексте со схемой в промпте", async () => {
  answers = [{ status: 400 }, { text: good }];
  expect((await run()).summary).toBe("s");
  expect(bodies[1].output_config).toBeUndefined();
  expect(String(bodies[1].system)).toContain("строго по схеме");
});

it("после трёх невалидных ответов бросает ошибку", async () => {
  answers = [{ text: "{}" }, { text: "не json" }, { text: "{}" }];
  await expect(run()).rejects.toThrow();
  expect(bodies).toHaveLength(3);
});
