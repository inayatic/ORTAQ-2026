"use client";
import { useEffect } from "react";

// Корневой layout не видит ?lang=, поэтому атрибут lang страницы выставляем на клиенте.
export default function LangSync({ lang }: { lang: string }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
