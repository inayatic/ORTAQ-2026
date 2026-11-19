import Link from "next/link";
import Header from "@/app/Header";
import { Alert } from "@/app/ui";
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
  searchParams: Promise<{ lang?: string; level?: string; hints?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const s = getScenario(id);
  if (!s) notFound();
  const lang = parseLang(sp.lang);
  const level = parseLevel(sp.level);
  const t = getDict(lang);
  return (
    <main>
      <LangSync lang={lang} title={`${s.title[lang]} — ${t.title}`} />
      <Header lang={lang} />
      <Link href={`/?lang=${lang}`} className="text-sm underline">
        {t.back}
      </Link>
      <div className="mt-2 flex flex-wrap gap-1">
        <Alert tone="warning" compact>
          {t.disclaimer_short}
        </Alert>
        {process.env.LLM_MOCK === "true" && <Alert compact>{t.demo_badge}</Alert>}
      </div>
      <Chat
        scenarioId={s.id}
        level={level}
        lang={lang}
        maxTurns={s.max_turns}
        t={t}
        title={s.title[lang]}
        icon={s.icon}
        who={s.character.display[lang]}
        situation={s.situation[lang]}
        goal={s.student_goal[lang]}
        hints={s.hints.map((h) => ({ tip: h.tip[lang], phrase: h.phrase[lang] }))}
        hintsOn={sp.hints !== "off"}
      />
    </main>
  );
}
