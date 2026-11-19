import Link from "next/link";
import Header from "@/app/Header";
import { Alert } from "@/app/ui";
import LangSync from "@/lib/LangSync";
import { notFound } from "next/navigation";
import { getScenario } from "@/lib/scenarios";
import { getDict, parseLang, parseLevel } from "@/lib/i18n";
import ReviewView from "./ReviewView";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
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
      <LangSync lang={lang} title={`${t.review_title} — ${t.title}`} />
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
      <h1 className="mt-3 text-xl font-bold">
        {t.review_title}: {s.title[lang]}
      </h1>
      <ReviewView scenarioId={s.id} lang={lang} level={level} t={t} labels={Object.fromEntries(s.success_criteria.map((c) => [c.ru, c[lang]]))} />
    </main>
  );
}
