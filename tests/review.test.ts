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
  it("строки с TODO-VERIFY не попадают в факты", () => expect(legalFacts(s).join("")).not.toContain("TODO-VERIFY"));
});

describe.each(DIALOGS.map((d, i) => [i + 1, ...d] as const))("диалог %i, справка без проверенных фактов", (_n, messages, quote) => {
  it("нет номеров статей, чужих цитат и правовых утверждений", () => {
    const review = sanitize(badModel(quote), [], "ru", messages);
    expect(reviewSchema.safeParse(review).success).toBe(true);
    expect(JSON.stringify(review)).not.toMatch(/(ст\.|стать[яи]|art)\s*\d/i);
    expect(review.mistakes.map((m) => m.quote)).toEqual([quote]);
    expect(review.rights).toHaveLength(1);
    expect(review.rights[0]).not.toMatch(/10 дней/);
  });
});

describe("generateReview с настоящей справкой", () => {
  it("оставляет статьи из справки, убирает чужие и выдуманные", async () => {
    const facts = legalFacts(s);
    const allowed = facts.join(" ").match(/ст\.\s*(\d+)/)![1];
    mocked.mockResolvedValue({ ...badModel(DIALOGS[0][1]), rights: [`по ст. ${allowed} и по ст. 999`] });
    const { review } = await generateReview(s, "ru", DIALOGS[0][0]);
    expect(review.rights[0]).toBe(`по ст. ${allowed} и по […]`);
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

describe("sanitize: цитаты", () => {
  it("убирает повтор одной цитаты и оставляет не больше 3 ошибок", () => {
    const m = (quote: string) => ({ quote, problem: "p", better_phrase: "b", tag: "t" });
    const msgs = [{ role: "user" as const, content: "раз два три четыре пять" }];
    const r = sanitize({ ...badModel("x"), mistakes: [m("раз"), m("Раз"), m("два"), m("три"), m("четыре")] }, [], "ru", msgs);
    expect(r.mistakes.map((x) => x.quote)).toEqual(["раз", "два", "три"]);
  });
});

describe("sanitize: критерии", () => {
  it("возвращает каноническое название, если модель сменила регистр", () => {
    const r = sanitize({ ...badModel("x"), scores: [{ criterion: "Потребовал письменное основание", score: 1, comment: "" }] }, [], "en", [], ["потребовал письменное основание"]);
    expect(r.scores[0].criterion).toBe("потребовал письменное основание");
  });
});

describe("sanitize со справкой", () => {
  it("оставляет статью из справки и убирает чужую", () => {
    const facts = ["Срок возврата: ст. 5 — 10 дней"];
    const r = sanitize({ ...badModel("x"), summary: "ст. 5 и ст. 9", rights: ["см. ст. 5, ст. 9"] }, facts, "ru", []);
    expect(r.summary).toBe("ст. 5 и […]");
    expect(r.rights).toEqual(["см. ст. 5, […]"]);
  });
  it("разрешённый номер статьи не режется при другой форме записи", () => {
    const r = sanitize({ ...badModel("x"), summary: "Статья 5 и Article 9" }, ["Срок: ст. 5"], "ru", []);
    expect(r.summary).toBe("Статья 5 и […]");
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
