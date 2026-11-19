import fs from "node:fs";
import path from "node:path";
import type { Message } from "./llm";
import type { Review } from "./review";
import type { Scenario } from "./scenarios";

type Demo = {
  replies: string[];
  criteria: { keywords: string[]; good: string; bad: string; problem: string; better: string; tag: string }[];
  next_steps: string[];
};

const load = (s: Scenario): Demo =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/demo", `${path.basename(s.id)}.json`), "utf8"));

export const demoReplies = (s: Scenario) => load(s).replies;

/** Демо без ИИ: балл по числу реплик студента с ключевыми словами; цитаты — реальные реплики студента. */
export function demoReview(s: Scenario, messages: Message[], facts: string[] = []): Review {
  const d = load(s);
  const student = messages.filter((m) => m.role === "user").map((m) => m.content);
  const scores = s.success_criteria.map(({ ru: criterion }, i) => {
    const c = d.criteria[i];
    const hits = student.filter((m) => c.keywords.some((k) => m.toLowerCase().includes(k))).length;
    const score = hits ? 2 : 0; // демо не умеет оценивать «частично»: либо сказано, либо нет
    return { criterion, score, comment: score === 2 ? c.good : c.bad };
  });
  const weak = scores.flatMap((x, i) => (x.score < 2 ? [d.criteria[i]] : []));
  return {
    summary: "Демо-разбор: оценка по ключевым словам в ваших репликах, без ИИ.",
    scores,
    mistakes: weak.map((c, i) => ({
      quote: student[(student.length - 1 - i + student.length * 2) % student.length].slice(0, 120),
      problem: c.problem,
      better_phrase: c.better,
      tag: c.tag,
    })),
    rights: facts.slice(0, 3), // реальные строки справки, ничего нового
    next_steps: d.next_steps,
  };
}
