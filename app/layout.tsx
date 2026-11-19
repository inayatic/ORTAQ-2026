import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Тренажёр трудных разговоров" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="mx-auto max-w-3xl p-4 text-slate-900">
        {children}
        <footer className="mt-8 border-t pt-3 text-sm text-slate-600">
          Это учебный тренажёр, а не юридическая консультация.
        </footer>
      </body>
    </html>
  );
}
