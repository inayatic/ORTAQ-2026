import type { ReactNode } from "react";

// Общие «кирпичики»: кнопки (классы, чтобы подходили и <button>, и <Link>), карточка, плашка.
const base = "inline-flex min-h-11 items-center justify-center gap-1 rounded-xl px-4 py-2 font-medium transition-colors disabled:opacity-50";
export const btn = {
  primary: `${base} bg-brand-700 text-white hover:bg-brand-800`,
  secondary: `${base} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`,
};

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>
);

const tones = { info: "bg-sky-50 text-sky-900", warning: "bg-amber-50 text-amber-900", success: "bg-green-50 text-green-900" };
export const Alert = ({ tone = "info", compact = false, children, className = "" }: { tone?: keyof typeof tones; compact?: boolean; children: ReactNode; className?: string }) => (
  <p role={tone === "success" ? "status" : "note"} className={`rounded-xl px-3 ${compact ? "py-1 text-xs" : "py-2 text-sm"} ${tones[tone]} ${className}`}>
    {children}
  </p>
);
