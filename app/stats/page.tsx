import Link from "next/link";
import LangSync from "@/lib/LangSync";
import { getStats } from "@/lib/db";
import { getDict, parseLang } from "@/lib/i18n";
import { loadScenarios } from "@/lib/scenarios";

export const dynamic = "force-dynamic";

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const lang = parseLang((await searchParams).lang);
  const t = getDict(lang);
  const st = getStats();
  // в БД критерий хранится по-русски и обрезан до 40 символов
  const crit = (id: string, c: string) =>
    loadScenarios().find((s) => s.id === id)?.success_criteria.find((k) => k.ru.toLowerCase().slice(0, 40) === c)?.[lang] ?? c;
  const title = (id: string) => loadScenarios().find((s) => s.id === id)?.title[lang] ?? id;
  return (
    <main>
      <LangSync lang={lang} />
      <Link href={`/?lang=${lang}`} className="text-sm underline">
        {t.back}
      </Link>
      <h1 className="mt-3 text-xl font-bold">{t.stats_title}</h1>
      <p className="text-sm text-slate-600">{t.stats_note}</p>
      {st.sessions.length === 0 && <p className="mt-4">{t.stats_empty}</p>}
      {st.sessions.length > 0 && (
        <div className="mt-4 space-y-6">
          <section>
            <h2 className="font-semibold">{t.stats_sessions}</h2>
            <ul className="list-disc pl-5">
              {st.sessions.map((r) => (
                <li key={r.scenario_id}>
                  {title(r.scenario_id)}: {r.n}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="font-semibold">{t.stats_mistakes}</h2>
            <ul className="list-disc pl-5">
              {st.mistakes.map((r) => (
                <li key={r.scenario_id + r.tag}>
                  {title(r.scenario_id)} — {r.tag}: {r.n}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="font-semibold">{t.stats_criteria}</h2>
            <ul className="list-disc pl-5">
              {st.criteria.map((r) => (
                <li key={r.scenario_id + r.criterion}>
                  {title(r.scenario_id)} — {crit(r.scenario_id, r.criterion)}: {r.avg}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}
