"use client";
import { useEffect, useState } from "react";
import type { Dict, Lang, Level } from "@/lib/i18n";
import type { Review } from "@/lib/review";

type State = { status: "loading" } | { status: "empty" } | { status: "done"; review: Review; fallback: boolean };

export default function ReviewView({ scenarioId, lang, level, t }: { scenarioId: string; lang: Lang; level: Level; t: Dict }) {
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
      try {
        const res = await fetch("/api/review", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ scenarioId, lang, level, messages }),
        });
        if (!res.ok) throw new Error();
        set({ status: "done", ...(await res.json()) });
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

  return (
    <div className="mt-4 space-y-6">
      <section>
        <h2 className="font-semibold">{t.review_summary}</h2>
        <p>{r.summary}</p>
        {fallback && (
          <button onClick={retry} className="mt-2 rounded bg-slate-900 px-3 py-1 text-white focus:outline-2 focus:outline-offset-2 focus:outline-slate-900">
            {t.review_retry}
          </button>
        )}
      </section>
      {r.scores.length > 0 && (
        <section>
          <h2 className="font-semibold">{t.review_scores}</h2>
          <ul className="space-y-2">
            {r.scores.map((s, i) => (
              <li key={i}>
                <div className="flex items-center gap-2">
                  <span className="flex-1">{s.criterion}</span>
                  <meter min={0} max={2} value={s.score} aria-label={s.criterion} className="w-24" />
                  <span>{s.score}/2</span>
                </div>
                <p className="text-sm text-slate-700">{s.comment}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!fallback && (
        <section>
          <h2 className="font-semibold">{t.review_mistakes}</h2>
          {r.mistakes.length === 0 && <p className="text-sm">{t.review_none}</p>}
          <ul className="space-y-3">
            {r.mistakes.map((m, i) => (
              <li key={i} className="rounded border p-3">
                <p className="text-sm">
                  {t.review_quote}: <q>{m.quote}</q>
                </p>
                <p>{m.problem}</p>
                <p className="text-green-800">
                  {t.review_better}: {m.better_phrase}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h2 className="font-semibold">{t.review_rights}</h2>
        <ul className="list-disc pl-5">
          {r.rights.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </section>
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
    </div>
  );
}
