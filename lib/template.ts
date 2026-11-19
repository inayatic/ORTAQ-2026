// Без fs: используется и на сервере, и в браузере.
export const TEMPLATE_FIELDS = ["recipient", "applicant", "details", "amount", "deadline", "date"] as const;
export type TemplateField = (typeof TEMPLATE_FIELDS)[number];

export const fieldsOf = (tpl: string): string[] => [...new Set([...tpl.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];

/** Пустое поле показываем прочерком, чтобы в предпросмотре было видно, что осталось заполнить. */
export const render = (tpl: string, values: Record<string, string>) =>
  tpl.replace(/\{\{(\w+)\}\}/g, (_, k: string) => values[k]?.trim() || "________");
