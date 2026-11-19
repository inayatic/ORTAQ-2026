import Link from "next/link";
import LangSync from "@/lib/LangSync";
import { notFound } from "next/navigation";
import { getScenario } from "@/lib/scenarios";
import { getDict, parseLang, parseLevel } from "@/lib/i18n";
import Chat from "./Chat";

export const dynamic = "force-dynamic";

export default async function ScenarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; level?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const s = getScenario(id);
  if (!s) notFound();
  const lang = parseLang(sp.lang);
  const level = parseLevel(sp.level);
  const t = getDict(lang);
  return (
    <main>
      <LangSync lang={lang} />
      <Link href={`/?lang=${lang}`} className="text-sm underline">
        {t.back}
      </Link>
      <p className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-900">{t.disclaimer}</p>
      <h1 className="mt-3 text-xl font-bold">{s.title[lang]}</h1>
      <p className="text-sm">{s.situation[lang]}</p>
      <p className="mt-1 text-sm">
        <b>{t.goal}:</b> {s.student_goal[lang]}
      </p>
      <Chat scenarioId={s.id} level={level} lang={lang} maxTurns={s.max_turns} t={t} />
    </main>
  );
}
