// Единственный файл, который знает о провайдере. Чтобы сменить его, правим только этот файл.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export type Message = { role: "user" | "assistant"; content: string };
// mock — заготовка для LLM_MOCK=true: для chat массив реплик, для chatJson готовый объект.
export type ChatOptions = { system?: string; maxTokens?: number; mock?: unknown };

const mock = () => process.env.LLM_MOCK === "true";

const MOCK_REPLIES = [
  "Слушайте, у нас так принято. Залог остаётся у меня, мы же договаривались устно.",
  "Документов у меня с собой нет, но я вам говорю: срок ещё не вышел.",
  "Давайте не будем усложнять. Вы хотите решить это быстро или нет?",
];

export const MOCK_REVIEW = {
  summary: "Демо-разбор (mock-режим).",
  scores: [{ criterion: "потребовал письменное основание", score: 1, comment: "Демо." }],
  mistakes: [],
  rights: [],
  next_steps: ["Напишите письменное заявление по шаблону."],
};

let client: Anthropic | undefined;
const api = () => (client ??= new Anthropic({ apiKey: process.env.LLM_API_KEY }));
const model = () => process.env.LLM_MODEL ?? "claude-sonnet-5-5";

/** Потоковая реплика: async-итератор кусков текста. */
export async function* chat(messages: Message[], opts: ChatOptions = {}): AsyncGenerator<string> {
  if (mock()) {
    const replies = (opts.mock as string[] | undefined) ?? MOCK_REPLIES;
    const turn = messages.filter((m) => m.role === "user").length;
    // по словам с паузой, чтобы в демо ответ «печатался»
    for (const w of replies[(turn - 1 + replies.length) % replies.length].split(/(?<= )/)) {
      yield w;
      await new Promise((r) => setTimeout(r, 25));
    }
    return;
  }
  const stream = api().messages.stream({
    model: model(),
    system: opts.system,
    max_tokens: opts.maxTokens ?? 400,
    messages,
  });
  for await (const ev of stream) {
    if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield ev.delta.text;
  }
}

// Структурированный вывод не принимает числовые ограничения; их проверяет zod после ответа.
const UNSUPPORTED = ["minimum", "maximum", "minLength", "maxLength", "minItems", "maxItems", "pattern", "$schema"];
const strip = (x: unknown): unknown =>
  Array.isArray(x) ? x.map(strip) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).filter(([k]) => !UNSUPPORTED.includes(k)).map(([k, v]) => [k, strip(v)])) : x;

/** Структурированный ответ: JSON по схеме (output_config.format). Если провайдер отклонил такой запрос (400),
 * переходим на «JSON в тексте» со схемой в промпте. До 3 попыток, затем ошибка (запасной ответ — на вызывающем). */
export async function chatJson<T extends z.ZodTypeAny>(
  messages: Message[],
  schema: T,
  opts: ChatOptions = {},
): Promise<z.infer<T>> {
  if (mock()) return schema.parse(opts.mock ?? MOCK_REVIEW);
  const jsonSchema = strip(z.toJSONSchema(schema)) as { [key: string]: unknown };
  let structured = true;
  let lastErr: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await api().messages.create({
        model: model(),
        system: structured ? opts.system : `${opts.system ?? ""}\nОтветь только JSON без пояснений и без markdown, строго по схеме: ${JSON.stringify(jsonSchema)}`,
        max_tokens: opts.maxTokens ?? 4000,
        ...(structured ? { output_config: { format: { type: "json_schema" as const, schema: jsonSchema } } } : {}),
        messages,
      });
      const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      const parsed = schema.safeParse(JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)));
      if (parsed.success) return parsed.data;
      // Только причина, без содержимого диалога.
      console.error("chatJson invalid", { stop: res.stop_reason, issues: parsed.error.issues.map((x) => `${x.path.join(".")}:${x.code}`) });
      lastErr = parsed.error;
    } catch (e) {
      lastErr = e;
      if (structured && e instanceof Anthropic.APIError && e.status === 400) {
        console.error("structured output rejected, falling back to text JSON:", e.message.slice(0, 200));
        structured = false;
      } else console.error("chatJson failed:", e instanceof Error ? e.message.slice(0, 200) : e);
    }
  }
  throw lastErr;
}
