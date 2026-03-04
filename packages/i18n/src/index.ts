import type { SupportedLanguage } from "@capitao-diff/shared";

import enCommon from "../locales/en/common.json" with { type: "json" };
import enLanding from "../locales/en/landing.json" with { type: "json" };
import enDashboard from "../locales/en/dashboard.json" with { type: "json" };
import enCli from "../locales/en/cli.json" with { type: "json" };
import enQa from "../locales/en/qa.json" with { type: "json" };
import enDocs from "../locales/en/docs.json" with { type: "json" };
import ptCommon from "../locales/pt/common.json" with { type: "json" };
import ptLanding from "../locales/pt/landing.json" with { type: "json" };
import ptDashboard from "../locales/pt/dashboard.json" with { type: "json" };
import ptCli from "../locales/pt/cli.json" with { type: "json" };
import ptQa from "../locales/pt/qa.json" with { type: "json" };
import ptDocs from "../locales/pt/docs.json" with { type: "json" };

export type TranslationNamespace =
  | "common"
  | "landing"
  | "dashboard"
  | "cli"
  | "qa"
  | "docs";

type TranslationDictionary = Record<string, string>;

type Locales = Record<SupportedLanguage, Record<TranslationNamespace, TranslationDictionary>>;

const FALLBACK_LANGUAGE: SupportedLanguage = "en";

const locales: Locales = {
  en: {
    common: enCommon,
    landing: enLanding,
    dashboard: enDashboard,
    cli: enCli,
    qa: enQa,
    docs: enDocs
  },
  pt: {
    common: ptCommon,
    landing: ptLanding,
    dashboard: ptDashboard,
    cli: ptCli,
    qa: ptQa,
    docs: ptDocs
  }
};

export const getFallbackLanguage = (): SupportedLanguage => FALLBACK_LANGUAGE;

export const normalizeLanguage = (language?: string | null): SupportedLanguage => {
  if (!language) {
    return FALLBACK_LANGUAGE;
  }

  const lower = language.toLowerCase();
  if (lower.startsWith("pt")) {
    return "pt";
  }

  return "en";
};

export const detectLanguage = (
  source?: string | null,
  fallback: SupportedLanguage = FALLBACK_LANGUAGE
): SupportedLanguage => {
  const normalized = normalizeLanguage(source ?? undefined);
  return normalized ?? fallback;
};

export const detectBrowserLanguage = (): SupportedLanguage => {
  if (typeof navigator === "undefined") {
    return FALLBACK_LANGUAGE;
  }

  return detectLanguage(navigator.language);
};

export const getDictionary = (
  namespace: TranslationNamespace,
  language: SupportedLanguage
): TranslationDictionary => {
  return locales[language]?.[namespace] ?? locales[FALLBACK_LANGUAGE][namespace];
};

export const translate = (
  namespace: TranslationNamespace,
  language: SupportedLanguage,
  key: string,
  values?: Record<string, string | number>
): string => {
  const dictionary = getDictionary(namespace, language);
  const fallbackDictionary = getDictionary(namespace, FALLBACK_LANGUAGE);
  const raw = dictionary[key] ?? fallbackDictionary[key] ?? key;

  if (!values) {
    return raw;
  }

  return Object.entries(values).reduce((acc, [name, value]) => {
    return acc.replaceAll(`{{${name}}}`, String(value));
  }, raw);
};

export const createTranslator = (
  language: SupportedLanguage,
  namespace: TranslationNamespace
) => {
  return (key: string, values?: Record<string, string | number>) =>
    translate(namespace, language, key, values);
};

export const availableLanguages: SupportedLanguage[] = ["en", "pt"];
