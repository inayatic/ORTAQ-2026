import "./globals.css";
import type { ReactNode } from "react";

const description = "Тренируйте трудные разговоры с ИИ-собеседником и узнайте, как отстаивать свои права. Учебный тренажёр, не юридическая консультация.";
export const metadata = {
  title: "Айт: тренажёр трудных разговоров",
  description,
  openGraph: { title: "Айт: тренажёр трудных разговоров", description, type: "website" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="mx-auto max-w-[720px] px-4 pb-8 font-sans text-slate-900">{children}</body>
    </html>
  );
}
