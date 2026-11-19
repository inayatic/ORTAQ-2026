"use client";
import { useEffect } from "react";

// Корневой layout не видит ?lang=, поэтому lang и заголовок страницы выставляем на клиенте.
export default function LangSync({ lang, title }: { lang: string; title?: string }) {
  useEffect(() => {
    document.documentElement.lang = lang;
    if (title) document.title = title;
  }, [lang, title]);
  return null;
}
