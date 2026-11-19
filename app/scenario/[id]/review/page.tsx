import { getDict, parseLang } from "@/lib/i18n";

// Заглушка: разбор делается на Этапе 3.
export default async function Review({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const t = getDict(parseLang((await searchParams).lang));
  return (
    <main>
      <p className="rounded bg-amber-50 p-2 text-sm text-amber-900">{t.disclaimer}</p>
      <p className="mt-4">{t.review_soon}</p>
    </main>
  );
}
