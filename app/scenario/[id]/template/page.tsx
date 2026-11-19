import Link from "next/link";
import { notFound } from "next/navigation";
import { getScenario, getTemplate } from "@/lib/scenarios";
import { getDict, parseLang } from "@/lib/i18n";
import TemplateForm from "./TemplateForm";

export const dynamic = "force-dynamic";

export default async function TemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const s = getScenario(id);
  if (!s) notFound();
  const lang = parseLang(sp.lang);
  const t = getDict(lang);
  return (
    <main>
      <Link href={`/?lang=${lang}`} className="text-sm underline">
        {t.back}
      </Link>
      <p className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-900">{t.disclaimer}</p>
      <h1 className="mt-3 text-xl font-bold">
        {t.template_title}: {s.title[lang]}
      </h1>
      <p className="text-sm">{t.template_note}</p>
      <TemplateForm id={s.id} tpl={getTemplate(s)} t={t} />
    </main>
  );
}
