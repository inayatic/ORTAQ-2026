import ru from "@/content/i18n/ru.json";
import kk from "@/content/i18n/kk.json";
import en from "@/content/i18n/en.json";

export const LANGS = ["ru", "kk", "en"] as const;
export type Lang = (typeof LANGS)[number];
export type Dict = typeof ru;
export const LEVELS = ["soft", "stubborn", "aggressive"] as const;
export type Level = (typeof LEVELS)[number];

const dicts: Record<Lang, Dict> = { ru, kk, en };
export const parseLang = (v?: string): Lang => (LANGS.includes(v as Lang) ? (v as Lang) : "ru");
export const parseLevel = (v?: string): Level => (LEVELS.includes(v as Level) ? (v as Level) : "soft");
export const getDict = (l: Lang) => dicts[l];
