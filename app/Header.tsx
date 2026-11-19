import Link from "next/link";
import { LANGS, type Lang } from "@/lib/i18n";

// Шапка: бренд и (на главной) переключатель языка пилюлями.
export default function Header({ lang, pills = false }: { lang: Lang; pills?: boolean }) {
  return (
    <header className="flex items-center justify-between py-3">
      <Link href={`/?lang=${lang}`} className="flex items-center gap-2 font-bold tracking-wide">
        <svg aria-hidden width="28" height="28" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="8" fill="#0f766e" />
          <path d="M8 10h16v9h-8l-5 4v-4H8z" fill="#fff" />
        </svg>
        {lang === "en" ? "Aiyt" : "Айт"}
      </Link>
      {pills && (
        <nav aria-label="Language" className="flex gap-1 rounded-full bg-slate-200 p-1 text-sm">
          {LANGS.map((l) => (
            <Link
              key={l}
              href={`/?lang=${l}`}
              aria-current={l === lang ? "page" : undefined}
              className={`flex min-h-9 min-w-11 items-center justify-center rounded-full px-3 font-medium ${l === lang ? "bg-brand-700 text-white" : "text-slate-700"}`}
            >
              {l.toUpperCase()}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
