import Link from "next/link";
import Header from "../Header";
import { Alert, Card } from "../ui";
import LangSync from "@/lib/LangSync";
import { getDict, parseLang } from "@/lib/i18n";

export default async function About({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const lang = parseLang((await searchParams).lang);
  const t = getDict(lang);
  return (
    <main>
      <LangSync lang={lang} title={`${t.about_title} — ${t.title}`} />
      <Header lang={lang} />
      <Link href={`/?lang=${lang}`} className="text-sm underline">
        {t.back}
      </Link>
      <Alert tone="warning" className="mt-2">
        {t.disclaimer}
      </Alert>
      <h1 className="mt-3 text-2xl font-bold">{t.about_title}</h1>
      <Card className="mt-3 space-y-3">
        {([t.about_name, t.about_how, t.about_limits, t.about_sources, t.about_privacy, t.about_help] as string[]).map((p) => (
          <p key={p}>{p}</p>
        ))}
      </Card>
    </main>
  );
}
