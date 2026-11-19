"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { btn } from "@/app/ui";
import type { Dict, Lang, Level } from "@/lib/i18n";

type Msg = { role: "user" | "assistant"; content: string };
type Props = {
  scenarioId: string;
  level: Level;
  lang: Lang;
  maxTurns: number;
  t: Dict;
  title: string;
  icon: string;
  who: string;
  situation: string;
  goal: string;
  hints: { tip: string; phrase: string }[];
  hintsOn: boolean;
};
const ERRORS: Record<string, keyof Dict> = {
  empty: "err_empty",
  too_long: "err_too_long",
  injection: "err_injection",
  rate_limited: "err_rate",
  llm_failed: "err_llm",
  turn_limit: "limit_reached",
};

// Метка [[GOAL]] — сигнал модели «цель достигнута»; скрываем её, в том числе недописанную в потоке.
const GOAL = /\[\[GOAL\]\]/;
const show = (r: string) =>
  r
    .replace(/\s*\[\[[A-Z]*\]?\]?$/, "")
    .replace(GOAL, "")
    .trim();

export default function Chat(p: Props) {
  const { t } = p;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const [goal, setGoal] = useState(false);
  const [hintsOn, setHintsOn] = useState(p.hintsOn);
  const turns = messages.filter((m) => m.role === "user").length;
  const done = turns >= p.maxTurns;
  const hint =
    hintsOn && !busy && !done
      ? p.hints[Math.min(turns, p.hints.length - 1)]
      : null;
  const reviewHref = `/scenario/${p.scenarioId}/review?lang=${p.lang}&level=${p.level}`;

  // Новая попытка: забываем, пользовался ли студент подсказками в прошлый раз.
  useEffect(() => {
    try {
      sessionStorage.removeItem(`ortaq:hints:${p.scenarioId}`);
    } catch {}
  }, [p.scenarioId]);

  // Переписка живёт только в браузере; страница разбора читает её отсюда.
  useEffect(() => {
    if (!messages.length) return;
    try {
      sessionStorage.setItem(`ortaq:${p.scenarioId}`, JSON.stringify(messages));
    } catch {}
  }, [messages, p.scenarioId]);

  // Новая реплика всегда видна над полем ввода.
  useEffect(() => {
    if (messages.length) end.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  // После ответа собеседника возвращаем курсор в поле ввода.
  useEffect(() => {
    if (!busy && messages.length) input.current?.focus();
  }, [busy, messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy || done) return;
    const history: Msg[] = [...messages, { role: "user", content: text }];
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scenarioId: p.scenarioId,
          level: p.level,
          lang: p.lang,
          messages: history,
        }),
      });
      if (!res.ok || !res.body) {
        const { error: code } = await res.json().catch(() => ({ error: "" }));
        setError(t[ERRORS[code] ?? "err_generic"]);
        return; // текст остаётся в поле, чтобы можно было повторить
      }
      setMessages([...history, { role: "assistant", content: "" }]);
      setText("");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let reply = "";
      for (;;) {
        const { done: end, value } = await reader.read();
        if (end) break;
        reply += dec.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: show(reply) }]);
      }
      if (GOAL.test(reply)) setGoal(true);
    } catch {
      setError(t.err_generic);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-3">
      <h1 className="sr-only">{p.title}</h1>
      <div className="sticky top-0 z-10 -mx-4 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xl"
          >
            {p.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">{p.who}</p>
            <p className="text-xs text-slate-600">{t.ai_label}</p>
          </div>
          <Link
            href={reviewHref}
            onClick={(e) => {
              if (turns < 3 && !window.confirm(t.finish_confirm))
                e.preventDefault();
            }}
            className={`${btn.secondary} px-3 text-sm`}
          >
            {t.finish}
          </Link>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={p.maxTurns}
            aria-valuenow={turns}
            aria-label={`${t.turn} ${turns} ${t.of} ${p.maxTurns}`}
            className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"
          >
            <div
              className="h-full bg-brand-700 transition-all"
              style={{ width: `${(turns / p.maxTurns) * 100}%` }}
            />
          </div>
          <span>
            {t.turn} {turns} {t.of} {p.maxTurns}
          </span>
          <button
            type="button"
            aria-pressed={hintsOn}
            onClick={() => setHintsOn(!hintsOn)}
            className="min-h-9 rounded-full border border-slate-300 px-3 text-xs font-medium"
          >
            {hintsOn ? t.hints_on : t.hints_off}
          </button>
        </div>
      </div>

      <details
        key={turns > 0 ? "closed" : "open"}
        open={turns === 0}
        className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm"
      >
        <summary className="cursor-pointer font-medium">{t.memo_title}</summary>
        <p className="mt-2">{p.situation}</p>
        <p className="mt-1">
          <b>{t.goal}:</b> {p.goal}
        </p>
      </details>

      <div aria-live="polite" className="mt-3 min-h-40 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-slate-600">{t.first_hint}</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <span
              className={`max-w-[85%] break-words rounded-2xl px-4 py-2 ${m.role === "user" ? "rounded-br-sm bg-brand-700 text-white" : "rounded-bl-sm border border-slate-200 bg-white"}`}
            >
              {m.content || (
                <span className="inline-flex gap-1" role="status">
                  <span className="sr-only">{t.thinking}</span>
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      aria-hidden
                      className="size-2 animate-pulse rounded-full bg-slate-400"
                      style={{ animationDelay: `${d * 200}ms` }}
                    />
                  ))}
                </span>
              )}
            </span>
          </div>
        ))}
        <div ref={end} className="scroll-mb-64" />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {goal && (
        <p
          role="status"
          className="mt-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-900"
        >
          {t.goal_reached}
        </p>
      )}
      {done && <p className="mt-2 text-sm">{t.limit_reached}</p>}

      <div className="sticky bottom-0 -mx-4 mt-3 border-t border-slate-200 bg-white/95 px-4 pt-2 backdrop-blur">
        {hint && (
          <div className="max-h-48 overflow-y-auto rounded-xl bg-violet-50 p-3 text-sm text-violet-950">
            <p>
              <b>{t.hint_title}:</b> {hint.tip}
            </p>
            <p className="mt-1 break-words italic">{hint.phrase}</p>
            <button
              type="button"
              onClick={() => {
                setText(hint.phrase);
                try {
                  sessionStorage.setItem(`ortaq:hints:${p.scenarioId}`, "1");
                } catch {}
                input.current?.focus();
              }}
              className="mt-2 min-h-10 rounded-xl border border-violet-300 bg-white px-3 font-medium"
            >
              {t.hint_use}
            </button>
          </div>
        )}

        <form onSubmit={send} className="flex gap-2 py-2">
          <label className="sr-only" htmlFor="msg">
            {t.placeholder}
          </label>
          <input
            id="msg"
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.placeholder}
            disabled={busy || done}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3"
          />
          <button disabled={busy || done} className={btn.primary}>
            {t.send}
          </button>
        </form>
      </div>
    </section>
  );
}
