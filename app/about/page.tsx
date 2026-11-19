import Link from "next/link";
import LangSync from "@/lib/LangSync";
import { getDict, parseLang } from "@/lib/i18n";

export default async function About({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const lang = parseLang((await searchParams).lang);
  const t = getDict(lang);
  return (
    <main>
      <LangSync lang={lang} />
      <Link href={`/?lang=${lang}`} className="text-sm underline">
        {t.back}
      </Link>
      <p className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-900">{t.disclaimer}</p>
      <h1 className="mt-3 text-xl font-bold">{t.about_title}</h1>
      <div className="mt-3 space-y-3">
        {([t.about_how, t.about_limits, t.about_sources, t.about_privacy, t.about_help] as string[]).map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </main>
  );
}
