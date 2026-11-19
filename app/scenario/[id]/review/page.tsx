import Link from "next/link";
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
      <LangSync lang={lang} />
      <Link href={`/?lang=${lang}`} className="text-sm underline">
        {t.back}
      </Link>
      <p className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-900">{t.disclaimer}</p>
      {process.env.LLM_MOCK === "true" && <p role="note" className="mt-2 rounded bg-sky-50 p-2 text-sm text-sky-900">{t.demo_banner}</p>}
      <h1 className="mt-3 text-xl font-bold">
        {t.review_title}: {s.title[lang]}
      </h1>
      <ReviewView scenarioId={s.id} lang={lang} level={level} t={t} />
      <p className="mt-6">
        <Link href={`/scenario/${s.id}/template?lang=${lang}`} className="underline">
          {t.template_link}
        </Link>
      </p>
    </main>
  );
}
