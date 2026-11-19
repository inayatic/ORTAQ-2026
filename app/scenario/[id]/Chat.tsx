"use client";
import Link from "next/link";
import { useState } from "react";
import type { Dict, Lang, Level } from "@/lib/i18n";

type Msg = { role: "user" | "assistant"; content: string };
const ERRORS: Record<string, keyof Dict> = {
  empty: "err_empty",
  too_long: "err_too_long",
  injection: "err_injection",
  rate_limited: "err_rate",
  llm_failed: "err_llm",
  turn_limit: "limit_reached",
};

export default function Chat(p: { scenarioId: string; level: Level; lang: Lang; maxTurns: number; t: Dict }) {
  const { t } = p;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const turns = messages.filter((m) => m.role === "user").length;
  const done = turns >= p.maxTurns;

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
        body: JSON.stringify({ scenarioId: p.scenarioId, level: p.level, lang: p.lang, messages: history }),
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
        setMessages([...history, { role: "assistant", content: reply }]);
      }
    } catch {
      setError(t.err_generic);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between text-sm">
        <span>
          {t.turn} {turns} {t.of} {p.maxTurns}
        </span>
        <Link href={`/scenario/${p.scenarioId}/review?lang=${p.lang}`} className="rounded border px-3 py-1 focus:outline-2 focus:outline-offset-2 focus:outline-slate-900">
          {t.finish}
        </Link>
      </div>
      <div aria-live="polite" className="mt-2 min-h-40 space-y-2 rounded border p-3">
        {messages.length === 0 && <p className="text-sm text-slate-600">{t.first_hint}</p>}
        {messages.map((m, i) => (
          <p key={i} className={m.role === "user" ? "text-right" : ""}>
            <span className={`inline-block rounded px-3 py-1 ${m.role === "user" ? "bg-slate-900 text-white" : "bg-slate-100"}`}>{m.content || "…"}</span>
          </p>
        ))}
        {busy && <p className="text-sm text-slate-600">{t.thinking}</p>}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {done && <p className="mt-2 text-sm">{t.limit_reached}</p>}
      <form onSubmit={send} className="mt-2 flex gap-2">
        <label className="sr-only" htmlFor="msg">
          {t.placeholder}
        </label>
        <input
          id="msg"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.placeholder}
          disabled={busy || done}
          className="flex-1 rounded border p-2 focus:outline-2 focus:outline-slate-900"
        />
        <button disabled={busy || done} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50 focus:outline-2 focus:outline-offset-2 focus:outline-slate-900">
          {t.send}
        </button>
      </form>
    </section>
  );
}
