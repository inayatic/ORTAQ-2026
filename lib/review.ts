import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { chatJson, type Message } from "./llm";
import { demoReview } from "./demo";
import { getDict, type Lang } from "./i18n";
import { buildReviewPrompt } from "./prompts";
import { articlesIn, stripArticles } from "./safety";
import type { Scenario } from "./scenarios";

export const reviewSchema = z.object({
  summary: z.string(),
  scores: z.array(z.object({ criterion: z.string(), score: z.number().int().min(0).max(2), comment: z.string() })),
  mistakes: z.array(z.object({ quote: z.string(), problem: z.string(), better_phrase: z.string(), tag: z.string() })),
  rights: z.array(z.string()),
  next_steps: z.array(z.string()),
});
export type Review = z.infer<typeof reviewSchema>;

/** Проверенные факты справки: строки «- …» без TODO-VERIFY. */
export function legalFacts(s: Scenario): string[] {
  const f = path.join(process.cwd(), "content/legal", s.legal_ref);
  if (!fs.existsSync(f)) return [];
  return fs
    .readFileSync(f, "utf8")
    .split("\n")
    .filter((l) => l.startsWith("- ") && !l.includes("TODO-VERIFY"))
    .map((l) => l.slice(2).trim());
}

const flat = (t: string) => t.toLowerCase().replace(/[«»"“”]/g, "").replace(/\s+/g, " ").trim();

/** Страховка поверх промпта: цитата должна быть у студента, статьи и права — только из справки. */
export function sanitize(r: Review, facts: string[], lang: Lang, messages: Message[]): Review {
  const student = flat(messages.filter((m) => m.role === "user").map((m) => m.content).join(" \n "));
  const allowed = articlesIn(facts.join(" "));
  const clean = (t: string) => stripArticles(t, allowed);
  return {
    summary: clean(r.summary),
    scores: r.scores.map((x) => ({ ...x, comment: clean(x.comment) })),
    mistakes: r.mistakes
      .filter((m) => flat(m.quote) && student.includes(flat(m.quote)))
      .map((m) => ({ ...m, problem: clean(m.problem), better_phrase: clean(m.better_phrase) })),
    rights: facts.length ? r.rights.map(clean) : [getDict(lang).rights_unverified],
    next_steps: r.next_steps.map(clean),
  };
}

export const fallbackReview = (lang: Lang): Review => ({
  summary: getDict(lang).review_fallback,
  scores: [],
  mistakes: [],
  rights: [getDict(lang).rights_unverified],
  next_steps: [],
});

export async function generateReview(s: Scenario, lang: Lang, messages: Message[]) {
  const facts = legalFacts(s);
  const transcript = messages.map((m) => `${m.role === "user" ? "Студент" : s.character.name}: ${m.content}`).join("\n");
  try {
    // chatJson уже делает один повтор при невалидном ответе
    const raw = await chatJson([{ role: "user", content: transcript }], reviewSchema, {
      system: buildReviewPrompt(s, lang, facts),
      mock: process.env.LLM_MOCK === "true" ? demoReview(s, messages) : undefined,
    });
    return { review: sanitize(raw, facts, lang, messages), fallback: false };
  } catch {
    return { review: fallbackReview(lang), fallback: true };
  }
}
