import { z } from "zod";
import { LANGS, LEVELS } from "@/lib/i18n";
import { recordReview } from "@/lib/db";
import { generateReview } from "@/lib/review";
import { getScenario } from "@/lib/scenarios";
import { MAX_INPUT, rateLimit, clientIp } from "@/lib/safety";

const body = z.object({
  scenarioId: z.string(),
  lang: z.enum(LANGS),
  level: z.enum(LEVELS).default("soft"),
  hints: z.boolean().default(false),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).min(1).max(40),
});

const fail = (error: string, status: number) => Response.json({ error }, { status });

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit("review:" + ip, Date.now(), 10)) return fail("rate_limited", 429);

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", 400);
  const { scenarioId, lang, level, hints, messages } = parsed.data;

  const scenario = getScenario(scenarioId);
  if (!scenario) return fail("unknown_scenario", 404);
  const user = messages.filter((m) => m.role === "user");
  if (!user.length || user.length > scenario.max_turns || user.some((m) => m.content.length > MAX_INPUT)) return fail("bad_request", 400);

  const result = await generateReview(scenario, lang, messages);
  if (!result.fallback) {
    recordReview({
      scenarioId, level, lang, hints, turns: user.length,
      scores: result.review.scores,
      mistakeTags: result.review.mistakes.map((m) => m.tag),
    });
  }
  return Response.json(result);
}
