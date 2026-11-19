import Link from "next/link";
import Best from "./Best";
import Header from "./Header";
import { Alert, Card, btn } from "./ui";
import LangSync from "@/lib/LangSync";
import { loadScenarios } from "@/lib/scenarios";
import { LEVELS, getDict, parseLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const lang = parseLang((await searchParams).lang);
  const t = getDict(lang);
  const steps = [t.how_1, t.how_2, t.how_3];
  return (
    <main>
      <LangSync lang={lang} title={t.title} />
      <Header lang={lang} pills />
      <section className="py-4">
        <h1 className="text-3xl font-bold leading-tight">{t.hero_title}</h1>
        <p className="mt-2 text-slate-700">{t.hero_sub}</p>
        <Alert tone="warning" className="mt-3">
          {t.disclaimer}
        </Alert>
      </section>

      <section aria-labelledby="how">
        <h2 id="how" className="font-semibold">
          {t.how_title}
        </h2>
        <ol className="mt-2 grid gap-2 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6" aria-labelledby="levels">
        <h2 id="levels" className="font-semibold">
          {t.level}
        </h2>
        <dl className="mt-1 space-y-1 text-sm text-slate-700">
          {LEVELS.map((lv) => (
            <div key={lv}>
              <dt className="inline font-medium">{t[`level_${lv}`]}</dt> <dd className="inline">— {t[`level_desc_${lv}`]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <ul className="mt-4 space-y-3">
        {loadScenarios().map((s) => (
          <li key={s.id}>
            <Card>
              <div className="flex items-start gap-3">
                <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-2xl">
                  {s.icon}
                </span>
                <div className="min-w-0">
                  <h2 className="font-semibold">{s.title[lang]}</h2>
                  <p className="text-sm text-slate-700">{s.situation[lang]}</p>
                  <p className="mt-1 text-sm">
                    <b>{t.goal}:</b> {s.student_goal[lang]}
                  </p>
                  <p className="text-sm text-slate-600">{t.scenario_time}</p>
                  <Best id={s.id} label={t.best_prev} />
                </div>
              </div>
              <form action={`/scenario/${s.id}`} className="mt-3">
                <input type="hidden" name="lang" value={lang} />
                <fieldset>
                  <legend className="sr-only">{t.level}</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {LEVELS.map((lv) => (
                      <label key={lv} className="group cursor-pointer">
                        <input type="radio" name="level" value={lv} defaultChecked={lv === "soft"} className="peer sr-only" />
                        <span className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-2 text-center text-sm font-medium peer-checked:border-brand-700 peer-checked:bg-brand-700 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-700">
                          <span aria-hidden className="hidden group-has-checked:inline">
                            ✓
                          </span>
                          {t[`level_${lv}`]}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <button aria-label={`${t.start}: ${s.title[lang]}`} className={`${btn.primary} mt-3 w-full sm:w-auto`}>
                  {t.start}
                </button>
              </form>
            </Card>
          </li>
        ))}
      </ul>
      <p className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href={`/stats?lang=${lang}`} className="underline">
          {t.stats_link}
        </Link>
        <Link href={`/about?lang=${lang}`} className="underline">
          {t.about_link}
        </Link>
      </p>
    </main>
  );
}
