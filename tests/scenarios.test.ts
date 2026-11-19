import { describe, it, expect } from "vitest";
import { loadScenarios } from "@/lib/scenarios";
import { chat, chatJson } from "@/lib/llm";
import { z } from "zod";

process.env.LLM_MOCK = "true";

describe("scenarios", () => {
  it("все сценарии проходят схему", () => {
    expect(loadScenarios().length).toBeGreaterThan(0);
  });
});

describe("llm mock", () => {
  it("chat отдаёт текст", async () => {
    let out = "";
    for await (const t of chat([{ role: "user", content: "привет" }])) out += t;
    expect(out.length).toBeGreaterThan(0);
  });
  it("chatJson валидирует по схеме", async () => {
    const r = await chatJson([], z.object({ summary: z.string() }).passthrough());
    expect(r.summary).toBeTruthy();
  });
});
