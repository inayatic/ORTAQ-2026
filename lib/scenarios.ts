import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const tr = z.object({ ru: z.string(), kk: z.string(), en: z.string() });

export const scenarioSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: tr,
  situation: tr,
  character: z.object({
    name: z.string(),
    goal: z.string(),
    tactics: z.array(z.string()).min(1),
    levels: z.object({ soft: z.string(), stubborn: z.string(), aggressive: z.string() }),
  }),
  student_goal: tr,
  success_criteria: z.array(tr).min(1),
  mistake_tags: z.array(z.object({ id: z.string().regex(/^[a-z_]+$/), ru: z.string(), kk: z.string(), en: z.string() })).min(2),
  legal_ref: z.string(),
  template: z.string(),
  max_turns: z.number().int().positive(),
});
export type Scenario = z.infer<typeof scenarioSchema>;

const dir = path.join(process.cwd(), "content/scenarios");

export function loadScenarios(): Scenario[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => scenarioSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))));
}

export const getScenario = (id: string) => loadScenarios().find((s) => s.id === id);

export const getTemplate = (s: Scenario) =>
  fs.readFileSync(path.join(process.cwd(), "content/templates", path.basename(s.template)), "utf8");
