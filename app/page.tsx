import Link from "next/link";
import Best from "./Best";
import LangSync from "@/lib/LangSync";
import { loadScenarios } from "@/lib/scenarios";
import { LANGS, LEVELS, getDict, parseLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const lang = parseLang((await searchParams).lang);
  const t = getDict(lang);
  return (
    <main>
      <LangSync lang={lang} />
      <nav aria-label="Language" className="flex gap-3 text-sm">
        {LANGS.map((l) => (
          <Link key={l} href={`/?lang=${l}`} aria-current={l === lang} className={l === lang ? "font-bold underline" : "underline"}>
            {l.toUpperCase()}
          </Link>
        ))}
      </nav>
      <h1 className="mt-3 text-2xl font-bold">{t.title}</h1>
      <p className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-900">{t.disclaimer}</p>
      <ul className="mt-4 space-y-3">
        {loadScenarios().map((s) => (
          <li key={s.id} className="rounded border p-3">
            <h2 className="font-semibold">{s.title[lang]}</h2>
            <p className="text-sm">{s.situation[lang]}</p>
            <Best id={s.id} label={t.best_prev} />
            <form action={`/scenario/${s.id}`} className="mt-2 flex flex-wrap items-end gap-3">
              <input type="hidden" name="lang" value={lang} />
              <label className="text-sm">
                {t.level}
                <select name="level" className="ml-2 rounded border p-1">
                  {LEVELS.map((lv) => (
                    <option key={lv} value={lv}>
                      {t[`level_${lv}`]}
                    </option>
                  ))}
                </select>
              </label>
              <button className="rounded bg-slate-900 px-3 py-1 text-white focus:outline-2 focus:outline-offset-2 focus:outline-slate-900">
                {t.start}
              </button>
            </form>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm">
        <Link href={`/stats?lang=${lang}`} className="underline">
          {t.stats_link}
        </Link>
        {" · "}
        <Link href={`/about?lang=${lang}`} className="underline">
          {t.about_link}
        </Link>
      </p>
    </main>
  );
}
