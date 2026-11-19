import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getScenario, getTemplate, loadScenarios } from "@/lib/scenarios";
import { TEMPLATE_FIELDS, fieldsOf, render } from "@/lib/template";
import { legalFacts } from "@/lib/review";
import { getDict, LANGS } from "@/lib/i18n";
import { getStats, recordReview } from "@/lib/db";

describe.each(loadScenarios().map((s) => [s.id, s] as const))("сценарий %s", (_id, s) => {
  it("справка существует, содержит проверяемые факты со ссылками на статьи и без TODO-VERIFY", () => {
    expect(fs.existsSync(path.join("content/legal", s.legal_ref))).toBe(true);
    const facts = legalFacts(s);
    expect(facts.length).toBeGreaterThanOrEqual(5);
    for (const f of facts) expect(f).not.toContain("TODO-VERIFY");
    expect(facts.some((f) => /ст\.\s*\d/.test(f))).toBe(true);
  });
  it("подсказки: на трёх языках, без скобочных заготовок и без номеров статей", () => {
    for (const h of s.hints) for (const l of LANGS) for (const x of [h.tip[l], h.phrase[l]]) {
      expect(x.trim()).not.toBe("");
      expect(x).not.toMatch(/[\[\]{}]|(ст\.|стать[яи]|бап)\s*\d/i);
    }
  });
  it("шаблон использует только известные поля и не называет статей", () => {
    for (const lang of LANGS) {
      const tpl = getTemplate(s, lang).text;
      for (const f of fieldsOf(tpl)) expect(TEMPLATE_FIELDS as readonly string[]).toContain(f);
      expect(tpl).not.toMatch(/(ст\.|стать[яи]|бап)\s*\d/i);
      for (const l of LANGS) for (const f of fieldsOf(tpl)) expect(getDict(l)[`f_${f}` as keyof ReturnType<typeof getDict>]).toBeTruthy();
    }
    expect(getTemplate(s, "kk").lang).toBe("kk");
    expect(fieldsOf(getTemplate(s, "kk").text).sort()).toEqual(fieldsOf(getTemplate(s).text).sort());
  });
});

it("три сценария", () => expect(loadScenarios().map((s) => s.id).sort()).toEqual(["consumer-refund", "rent-deposit", "unpaid-internship"]));

describe("шаблон", () => {
  it("подставляет значения и оставляет прочерк", () => {
    expect(render("A {{amount}} B {{date}}", { amount: " 5000 " })).toBe("A 5000 B ________");
  });
});

describe("статистика", () => {
  it("агрегирует ошибки и баллы без текстов", () => {
    const rec = (tags: string[], score: number, hints = false) =>
      recordReview({ scenarioId: "rent-deposit", level: "soft", lang: "ru", turns: 3, hints, scores: [{ criterion: "срок", score }], mistakeTags: tags });
    rec(["Нет требования", "угроза"], 0);
    rec(["нет требования"], 2);
    const st = getStats();
    expect(st.sessions).toEqual([{ scenario_id: "rent-deposit", n: 2 }]);
    expect(st.mistakes[0]).toEqual({ scenario_id: "rent-deposit", tag: "нет требования", n: 2 });
    expect(st.criteria[0].avg).toBe(1);
    expect(getScenario("rent-deposit")).toBeTruthy();
    rec([], 2, true);
    expect(getStats().hints).toEqual([{ hints: 0, n: 2, avg: 1 }, { hints: 1, n: 1, avg: 2 }]);
  });
});

describe("языки", () => {
  it("словари совпадают по ключам и не пусты", () => {
    const ru = Object.keys(getDict("ru")).sort();
    for (const l of LANGS) {
      const d = getDict(l) as Record<string, string>;
      expect(Object.keys(d).sort()).toEqual(ru);
      for (const v of Object.values(d)) expect(v.trim()).not.toBe("");
    }
  });
  it("сценарии переведены на все языки без заглушек", () => {
    for (const s of loadScenarios()) for (const l of LANGS) for (const v of [s.title[l], s.situation[l]]) expect(v).not.toMatch(/TODO-VERIFY/);
  });
});

describe("демо-режим", () => {
  it("демо-разбор по каждому сценарию валиден, цитаты — реплики студента", async () => {
    const { generateReview } = await import("@/lib/review");
    for (const s of loadScenarios()) {
      const msgs = [
        { role: "user" as const, content: "Здравствуйте, прошу вернуть деньги письменно" },
        { role: "assistant" as const, content: "Нет" },
        { role: "user" as const, content: "Ну хорошо" },
      ];
      const { review, fallback } = await generateReview(s, "ru", msgs);
      expect(fallback).toBe(false);
      expect(review.scores).toHaveLength(s.success_criteria.length);
      expect(review.mistakes.length).toBeGreaterThan(0);
      for (const m of review.mistakes) expect(msgs[0].content + msgs[2].content).toContain(m.quote);
      expect(review.rights.length).toBeGreaterThan(0);
      expect(review.rights.every((r) => legalFacts(s).includes(r))).toBe(true); // только строки справки
    }
  });
});

describe("критерии и схема для tool use", () => {
  it("критерии переведены на все языки", () => {
    for (const s of loadScenarios()) for (const c of s.success_criteria) for (const l of LANGS) expect(c[l].trim()).not.toBe("");
  });
  it("схема разбора переводится в JSON Schema объекта", async () => {
    const { z } = await import("zod");
    const { reviewSchema } = await import("@/lib/review");
    expect(z.toJSONSchema(reviewSchema)).toMatchObject({ type: "object", required: expect.arrayContaining(["summary", "scores"]) });
  });
});

describe("теги ошибок", () => {
  it("у каждого сценария есть other и переводы; демо использует только теги сценария", async () => {
    const { makeReviewSchema } = await import("@/lib/review");
    for (const s of loadScenarios()) {
      const ids = s.mistake_tags.map((t) => t.id);
      expect(ids).toContain("other");
      for (const t of s.mistake_tags) for (const l of LANGS) expect(t[l].trim()).not.toBe("");
      const demo = JSON.parse(fs.readFileSync(`content/demo/${s.id}.json`, "utf8"));
      for (const c of demo.criteria) expect(ids).toContain(c.tag);
      const schema = makeReviewSchema(ids);
      const bad = { summary: "", scores: [], mistakes: [{ quote: "q", problem: "", better_phrase: "", tag: "свободный тег" }], rights: [], next_steps: [] };
      expect(schema.safeParse(bad).success).toBe(false);
      expect(schema.safeParse({ ...bad, mistakes: [{ ...bad.mistakes[0], tag: ids[0] }] }).success).toBe(true);
    }
  });
});
