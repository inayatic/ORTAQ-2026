import Link from "next/link";
import Header from "@/app/Header";
import { Alert } from "@/app/ui";
import LangSync from "@/lib/LangSync";
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
  const tpl = getTemplate(s, lang);
  return (
    <main>
      <LangSync lang={lang} title={`${t.template_title} — ${t.title}`} />
      <Header lang={lang} />
      <Link href={`/?lang=${lang}`} className="text-sm underline">
        {t.back}
      </Link>
      <Alert tone="warning" className="mt-2">
        {t.disclaimer}
      </Alert>
      <h1 className="mt-3 text-2xl font-bold">
        {t.template_title}: {s.title[lang]}
      </h1>
      <p className="text-sm">{t.template_note}</p>
      {tpl.lang !== lang && <Alert tone="warning" className="mt-2">{t.template_ru_only}</Alert>}
      <TemplateForm id={s.id} tpl={tpl.text} t={t} />
    </main>
  );
}
