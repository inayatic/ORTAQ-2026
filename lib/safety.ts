export const MAX_INPUT = 800;

// Только попытки вытащить/переписать правила. «Выйди из роли» не блокируем: на это отвечает сам персонаж.
// \p{L} вместо \w: \w не совпадает с кириллицей.
const INJECTION = [
  /ignore (all |the |your )?(previous|above|prior|system)/iu,
  /(reveal|show|print|repeat) (me )?(your|the) (system )?(prompt|instructions)/iu,
  /system prompt/iu,
  /системн\p{L}* (промпт|инструкц)/iu,
  /(игнорируй|забудь)\p{L}* (все |свои |предыдущ\p{L}* )?(инструкц|правил|указани)/iu,
  /(покажи|выведи|повтори|раскрой)\p{L}* (свои |мне |свой )?(инструкц|промпт)/iu,
];

export type InputError = "empty" | "too_long" | "injection";

export function checkInput(text: string): InputError | null {
  if (!text.trim()) return "empty";
  if (text.length > MAX_INPUT) return "too_long";
  if (INJECTION.some((r) => r.test(text))) return "injection";
  return null;
}

// Любая ссылка на статью (рус/англ/каз), кроме разрешённых справкой, заменяется на «[…]».
const ARTICLE = /(?<!\p{L})(?:ст(?:атья|атьи|атье|атью|\.)|art(?:icle|\.)|бап)\s*\d+[\d.\-]*|\d+\s*-?\s*бап/giu;
// Сравниваем по номеру: «ст. 601», «статья 601» и «601-бап» — одна и та же статья.
const norm = (s: string) => s.match(/\d[\d.\-]*/)?.[0] ?? s;
export const articlesIn = (text: string) => new Set((text.match(ARTICLE) ?? []).map(norm));
export const stripArticles = (text: string, allowed: Set<string> = new Set()) =>
  text.replace(ARTICLE, (m) => (allowed.has(norm(m)) ? m : "[…]"));
export const filterOutput = (text: string) => stripArticles(text);

// shortcut: in-memory на один процесс, при нескольких инстансах заменить на общее хранилище.
const hits = new Map<string, number[]>();
export function rateLimit(key: string, now = Date.now(), limit = 20, windowMs = 60_000): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

// Render дописывает адрес клиента в конец x-forwarded-for; первое значение клиент может подделать, поэтому берём последнее.
export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "local";

// Фильтр для потока: отдаёт текст до последнего «безопасного» пробела, чтобы ссылка на статью,
// разрезанная границей чанков («ст.» | «601»), не прошла мимо filterOutput.
const OPEN_REF = /(?:(?<!\p{L})(?:ст\p{L}*\.?|art\p{L}*\.?|бап)|\d)\s*-?\s*$/iu;
export function streamFilter() {
  let buf = "";
  return {
    push(chunk: string): string {
      buf += chunk;
      let cut = buf.search(/\s\S*$/);
      while (cut > 0 && OPEN_REF.test(buf.slice(0, cut))) cut = buf.slice(0, cut).search(/\s\S*$/);
      if (cut <= 0) return "";
      const out = filterOutput(buf.slice(0, cut));
      buf = buf.slice(cut);
      return out;
    },
    flush: () => {
      const out = filterOutput(buf);
      buf = "";
      return out;
    },
  };
}
