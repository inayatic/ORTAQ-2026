import { z } from "zod";
import { LANGS } from "@/lib/i18n";
import { generateReview } from "@/lib/review";
import { getScenario } from "@/lib/scenarios";
import { MAX_INPUT, rateLimit } from "@/lib/safety";

const body = z.object({
  scenarioId: z.string(),
  lang: z.enum(LANGS),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).min(1).max(40),
});

const fail = (error: string, status: number) => Response.json({ error }, { status });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (!rateLimit("review:" + ip, Date.now(), 10)) return fail("rate_limited", 429);

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", 400);
  const { scenarioId, lang, messages } = parsed.data;

  const scenario = getScenario(scenarioId);
  if (!scenario) return fail("unknown_scenario", 404);
  const user = messages.filter((m) => m.role === "user");
  if (!user.length || user.length > scenario.max_turns || user.some((m) => m.content.length > MAX_INPUT)) return fail("bad_request", 400);

  return Response.json(await generateReview(scenario, lang, messages));
}
