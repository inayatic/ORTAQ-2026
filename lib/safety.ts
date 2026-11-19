export const MAX_INPUT = 800;

// Только попытки вытащить/переписать правила. «Выйди из роли» не блокируем: на это отвечает сам персонаж.
const INJECTION = [
  /ignore (all |the |your )?(previous|above|prior|system)/i,
  /(reveal|show|print|repeat) (me )?(your|the) (system )?(prompt|instructions)/i,
  /system prompt/i,
  /системн\w* (промпт|инструкц)/i,
  /(игнорируй|забудь)\w* (все |свои |предыдущ\w* )?(инструкц|правил|указани)/i,
  /(покажи|выведи|повтори|раскрой) (свои |мне )?(инструкц|промпт)/i,
];

export type InputError = "empty" | "too_long" | "injection";

export function checkInput(text: string): InputError | null {
  if (!text.trim()) return "empty";
  if (text.length > MAX_INPUT) return "too_long";
  if (INJECTION.some((r) => r.test(text))) return "injection";
  return null;
}

// Любая ссылка на статью (рус/англ/каз), кроме разрешённых справкой, заменяется на «[…]».
// shortcut: в потоке фильтр работает по куску, номер, разрезанный границей чанков, пройдёт; усилить буферизацией.
const ARTICLE = /(?<!\p{L})(?:ст(?:атья|атьи|атье|атью|\.)|art(?:icle|\.)|бап)\s*\d+[\d.\-]*|\d+\s*-?\s*бап/giu;
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
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
