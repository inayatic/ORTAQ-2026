"use client";
import { useState } from "react";
import type { Dict } from "@/lib/i18n";
import { fieldsOf, render } from "@/lib/template";

export default function TemplateForm({ id, tpl, t }: { id: string; tpl: string; t: Dict }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const text = render(tpl, values);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {}
  }
  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${id}.txt` });
    a.click();
    URL.revokeObjectURL(url);
  }
  const btn = "rounded bg-slate-900 px-3 py-1 text-white focus:outline-2 focus:outline-offset-2 focus:outline-slate-900";

  return (
    <div className="mt-4 grid gap-6 md:grid-cols-2">
      <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
        {fieldsOf(tpl).map((f) => {
          const label = t[`f_${f}` as keyof Dict] ?? f;
          const props = {
            id: `f-${f}`,
            value: values[f] ?? "",
            onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => {
              setCopied(false);
              setValues({ ...values, [f]: e.target.value });
            },
            className: "mt-1 w-full rounded border p-2 focus:outline-2 focus:outline-slate-900",
          };
          return (
            <div key={f}>
              <label htmlFor={props.id} className="text-sm">
                {label}
              </label>
              {f === "details" ? <textarea rows={4} {...props} /> : <input type={f === "date" || f === "deadline" ? "date" : "text"} {...props} />}
            </div>
          );
        })}
      </form>
      <section aria-label={t.preview}>
        <h2 className="font-semibold">{t.preview}</h2>
        <pre className="mt-1 whitespace-pre-wrap rounded border bg-slate-50 p-3 text-sm">{text}</pre>
        <div className="mt-2 flex gap-2">
          <button onClick={copy} className={btn}>
            {copied ? t.copied : t.copy}
          </button>
          <button onClick={download} className={btn}>
            {t.download}
          </button>
        </div>
      </section>
    </div>
  );
}
