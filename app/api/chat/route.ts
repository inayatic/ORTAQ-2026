import { z } from "zod";
import { chat } from "@/lib/llm";
import { demoReplies } from "@/lib/demo";
import { LANGS, LEVELS } from "@/lib/i18n";
import { buildCharacterPrompt } from "@/lib/prompts";
import { getScenario } from "@/lib/scenarios";
import { checkInput, streamFilter, rateLimit, clientIp } from "@/lib/safety";

const body = z.object({
  scenarioId: z.string(),
  level: z.enum(LEVELS),
  lang: z.enum(LANGS),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).min(1).max(40),
});

const fail = (error: string, status: number) => Response.json({ error }, { status });

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(ip)) return fail("rate_limited", 429);

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", 400);
  const { scenarioId, level, lang, messages } = parsed.data;

  const scenario = getScenario(scenarioId);
  if (!scenario) return fail("unknown_scenario", 404);
  if (messages[messages.length - 1].role !== "user") return fail("bad_request", 400);

  const userMsgs = messages.filter((m) => m.role === "user");
  if (userMsgs.length > scenario.max_turns) return fail("turn_limit", 400);
  for (const m of userMsgs) {
    const e = checkInput(m.content);
    if (e) return fail(e, 400);
  }

  // Берём первый кусок до ответа, чтобы сбой провайдера вернуть статусом, а не обрывом потока.
  const it = chat(messages, { system: buildCharacterPrompt(scenario, level, lang), mock: demoReplies(scenario) })[Symbol.asyncIterator]();
  let r: IteratorResult<string>;
  try {
    r = await it.next();
  } catch {
    return fail("llm_failed", 502);
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(c) {
      const f = streamFilter();
      try {
        while (!r.done) {
          const out = f.push(r.value);
          if (out) c.enqueue(enc.encode(out));
          r = await it.next();
        }
        c.enqueue(enc.encode(f.flush()));
        c.close();
      } catch (e) {
        c.error(e);
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
