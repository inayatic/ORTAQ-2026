"use client";
import { useEffect, useState } from "react";
import { LEVELS, type Dict, type Lang, type Level } from "@/lib/i18n";
import Link from "next/link";
import { Card, btn } from "@/app/ui";
import type { Review } from "@/lib/review";

type State = { status: "loading" } | { status: "empty" } | { status: "done"; review: Review; fallback: boolean };

export default function ReviewView({ scenarioId, lang, level, t, labels }: { scenarioId: string; lang: Lang; level: Level; t: Dict; labels: Record<string, string> }) {
  const [state, setState] = useState<State>({ status: "loading" });

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let off = false;
    const set = (x: State) => !off && setState(x);
    (async () => {
      let messages: unknown[] = [];
      try {
        messages = JSON.parse(sessionStorage.getItem(`ortaq:${scenarioId}`) ?? "[]");
      } catch {}
      if (!messages.length) return set({ status: "empty" });
      let hints = false;
      try {
        hints = sessionStorage.getItem(`ortaq:hints:${scenarioId}`) === "1";
      } catch {}
      try {
        const res = await fetch("/api/review", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ scenarioId, lang, level, hints, messages }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const sc: { score: number }[] = data.review?.scores ?? [];
        if (!data.fallback && sc.length) {
          const cur = { score: sc.reduce((a, x) => a + x.score, 0), max: sc.length * 2 };
          try {
            const prev = JSON.parse(localStorage.getItem(`ortaq:best:${scenarioId}`) ?? "null");
            if (!prev || cur.score / cur.max > prev.score / prev.max) localStorage.setItem(`ortaq:best:${scenarioId}`, JSON.stringify(cur));
          } catch {}
        }
        set({ status: "done", ...data });
      } catch {
        set({ status: "done", fallback: true, review: { summary: t.review_fallback, scores: [], mistakes: [], rights: [t.rights_unverified], next_steps: [] } });
      }
    })();
    return () => {
      off = true;
    };
  }, [scenarioId, lang, level, t, attempt]);

  const retry = () => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  };

  if (state.status === "loading") return <p role="status" className="mt-4">{t.review_loading}</p>;
  if (state.status === "empty") return <p className="mt-4">{t.review_empty}</p>;
  const { review: r, fallback } = state;
  const good = r.scores.length > 0 && r.scores.reduce((a, x) => a + x.score, 0) >= r.scores.length * 1.6;
  const harder = LEVELS[Math.min(LEVELS.indexOf(level) + 1, LEVELS.length - 1)];
  const again = (lv: Level, hints = true) => `/scenario/${scenarioId}?lang=${lang}&level=${lv}${hints ? "" : "&hints=off"}`;

  const sum = r.scores.reduce((a, x) => a + x.score, 0);
  const max = r.scores.length * 2;
  const verdict = sum >= max * 0.8 ? t.verdict_good : sum >= max * 0.5 ? t.verdict_mid : t.verdict_low;
  const mark = (n: number) => (n === 2 ? { i: "✓", c: "text-green-700", b: "bg-green-600" } : n === 1 ? { i: "~", c: "text-amber-700", b: "bg-amber-500" } : { i: "✗", c: "text-red-700", b: "bg-red-500" });

  return (
    <div className="mt-4 space-y-5">
      {r.scores.length > 0 && (
        <Card className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-sm text-slate-600">{t.score_title}</p>
            <p className="text-4xl font-bold text-brand-700">
              {sum}
              <span className="text-xl text-slate-500">
                {" "}
                {t.score_of} {max}
              </span>
            </p>
          </div>
          <p className="flex-1">{verdict}</p>
        </Card>
      )}
      <section>
        <h2 className="font-semibold">{t.review_summary}</h2>
        <p>{r.summary}</p>
        {fallback && (
          <button onClick={retry} className={`${btn.primary} mt-2`}>
            {t.review_retry}
          </button>
        )}
      </section>
      {r.scores.length > 0 && (
        <section>
          <h2 className="font-semibold">{t.review_scores}</h2>
          <ul className="mt-2 space-y-3">
            {r.scores.map((s, i) => {
              const m = mark(s.score);
              return (
                <li key={i}>
                  <div className="flex items-center gap-2">
                    <span aria-hidden className={`w-5 text-center font-bold ${m.c}`}>
                      {m.i}
                    </span>
                    <span className="min-w-0 flex-1">{labels[s.criterion] ?? s.criterion}</span>
                    <div role="img" aria-label={`${s.score}/2`} className="h-2 w-14 shrink-0 sm:w-24 overflow-hidden rounded-full bg-slate-200">
                      <div className={`h-full ${m.b}`} style={{ width: `${(s.score / 2) * 100}%` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right text-sm">{s.score}/2</span>
                  </div>
                  <p className="ml-7 text-sm text-slate-700">{s.comment}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {!fallback && (
        <section>
          <h2 className="font-semibold">{t.review_mistakes}</h2>
          {r.mistakes.length === 0 && <p className="text-sm">{t.review_none}</p>}
          <ul className="mt-2 space-y-3">
            {r.mistakes.map((m, i) => (
              <li key={i} className="space-y-2">
                <p className="rounded-xl border-l-4 border-red-400 bg-red-50 px-3 py-2 text-sm">
                  {t.review_quote}: <q>{m.quote}</q>
                </p>
                <p className="px-1 text-sm">{m.problem}</p>
                <p className="rounded-xl border-l-4 border-green-500 bg-green-50 px-3 py-2 text-sm">
                  <b>{t.review_better}:</b> {m.better_phrase}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Card>
        <h2 className="flex items-center gap-2 font-semibold">
          <span aria-hidden>🛡️</span> {t.review_rights}
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {r.rights.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-600">{t.rights_source}</p>
      </Card>
      {r.next_steps.length > 0 && (
        <section>
          <h2 className="font-semibold">{t.review_steps}</h2>
          <ul className="list-disc pl-5">
            {r.next_steps.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </section>
      )}
      <section className="flex flex-wrap items-center gap-3">
        {good && harder !== level && <p className="w-full text-sm text-green-800">{t.try_harder}</p>}
        <Link href={again(level)} className={btn.primary}>
          {t.play_again}
        </Link>
        <Link href={`/scenario/${scenarioId}/template?lang=${lang}`} className={btn.secondary}>
          {t.template_btn}
        </Link>
        <Link href={again(level, false)} className={btn.secondary}>
          {t.play_no_hints}
        </Link>
        {good && harder !== level && (
          <Link href={again(harder)} className={btn.secondary}>
            {t[`level_${harder}`]}
          </Link>
        )}
      </section>
    </div>
  );
}
