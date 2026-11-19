import { describe, expect, it, vi } from "vitest";
import { DIALOGS } from "./fixtures/dialogs";

vi.mock("@/lib/llm", () => ({ chatJson: vi.fn() }));
import { chatJson } from "@/lib/llm";
import { fallbackReview, generateReview, legalFacts, reviewSchema, sanitize } from "@/lib/review";
import { getScenario } from "@/lib/scenarios";
import { POST } from "@/app/api/review/route";

const s = getScenario("rent-deposit")!;
const mocked = vi.mocked(chatJson);

// «Плохая» модель: выдумывает статьи, цитирует то, чего студент не говорил, и нарушает право в rights.
const badModel = (quote: string) => ({
  summary: "По ст. 999 ГК вы правы.",
  scores: [{ criterion: "потребовал письменное основание", score: 2, comment: "Статья 12 это подтверждает" }],
  mistakes: [
    { quote: "этого я не говорил", problem: "ст. 5", better_phrase: "x", tag: "a" },
    { quote, problem: "Нет ссылки на ст. 77", better_phrase: "Прошу письменно указать основание", tag: "b" },
  ],
  rights: ["Срок возврата 10 дней по ст. 650"],
  next_steps: ["Обратитесь по ст. 1"],
});

describe("схема", () => {
  it("принимает валидный и отвергает score вне 0–2", () => {
    const ok = { summary: "", scores: [{ criterion: "a", score: 2, comment: "" }], mistakes: [], rights: [], next_steps: [] };
    expect(reviewSchema.safeParse(ok).success).toBe(true);
    expect(reviewSchema.safeParse({ ...ok, scores: [{ criterion: "a", score: 3, comment: "" }] }).success).toBe(false);
  });
});

describe("справка", () => {
  it("TODO-VERIFY не попадает в факты", () => expect(legalFacts(s)).toEqual([]));
});

describe.each(DIALOGS.map((d, i) => [i + 1, ...d] as const))("диалог %i", (_n, messages, quote) => {
  it("при TODO-VERIFY нет номеров статей, чужих цитат и правовых утверждений", async () => {
    mocked.mockResolvedValue(badModel(quote));
    const { review, fallback } = await generateReview(s, "ru", messages);
    expect(fallback).toBe(false);
    expect(reviewSchema.safeParse(review).success).toBe(true);
    expect(JSON.stringify(review)).not.toMatch(/(ст\.|стать[яи]|art)\s*\d/i);
    expect(review.mistakes.map((m) => m.quote)).toEqual([quote]);
    expect(review.rights).toHaveLength(1);
    expect(review.rights[0]).not.toMatch(/10 дней/);
  });
});

describe("сбои модели", () => {
  it("исключение провайдера или невалидного ответа даёт запасной разбор", async () => {
    mocked.mockImplementation(async () => {
      throw new Error("bad json");
    });
    const { review, fallback } = await generateReview(s, "en", DIALOGS[0][0]);
    expect(fallback).toBe(true);
    expect(review).toEqual(fallbackReview("en"));
  });
});

describe("sanitize со справкой", () => {
  it("оставляет статью из справки и убирает чужую", () => {
    const facts = ["Срок возврата: ст. 5 — 10 дней"];
    const r = sanitize({ ...badModel("x"), summary: "ст. 5 и ст. 9", rights: ["см. ст. 5, ст. 9"] }, facts, "ru", []);
    expect(r.summary).toBe("ст. 5 и […]");
    expect(r.rights).toEqual(["см. ст. 5, […]"]);
  });
  it("ловит английский и казахский формат", () => {
    const r = sanitize({ ...badModel("x"), summary: "Article 12 и 5-бап" }, [], "ru", []);
    expect(r.summary).toBe("[…] и […]");
  });
});

describe("POST /api/review", () => {
  const req = (b: unknown) => new Request("http://x", { method: "POST", headers: { "x-forwarded-for": "r" + Math.random() }, body: JSON.stringify(b) });
  it("отдаёт разбор и отклоняет пустой диалог", async () => {
    mocked.mockResolvedValue(badModel(DIALOGS[0][1]));
    const ok = await POST(req({ scenarioId: "rent-deposit", lang: "ru", messages: DIALOGS[0][0] }));
    expect(ok.status).toBe(200);
    expect((await ok.json()).fallback).toBe(false);
    expect((await POST(req({ scenarioId: "rent-deposit", lang: "ru", messages: [] }))).status).toBe(400);
  });
});
