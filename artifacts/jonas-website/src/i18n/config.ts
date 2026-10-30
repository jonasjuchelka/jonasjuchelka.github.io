/** Client-safe language catalogue. No fs access here. German stays at "/", every other language lives under "/<code>/". */
export const DEFAULT_LOCALE = "de";

export type LanguageInfo = { name: string; english: string; og: string; rtl?: boolean };

/** Languages that can have static pages. A language is only published if its dictionary file exists. */
export const LANGUAGES: Record<string, LanguageInfo> = {
  de: { name: "Deutsch", english: "German", og: "de_DE" },
  en: { name: "English", english: "English", og: "en_US" },
  es: { name: "Español", english: "Spanish", og: "es_ES" },
  fr: { name: "Français", english: "French", og: "fr_FR" },
  it: { name: "Italiano", english: "Italian", og: "it_IT" },
  pt: { name: "Português", english: "Portuguese", og: "pt_PT" },
  nl: { name: "Nederlands", english: "Dutch", og: "nl_NL" },
  pl: { name: "Polski", english: "Polish", og: "pl_PL" },
  tr: { name: "Türkçe", english: "Turkish", og: "tr_TR" },
  ru: { name: "Русский", english: "Russian", og: "ru_RU" },
  uk: { name: "Українська", english: "Ukrainian", og: "uk_UA" },
  zh: { name: "中文", english: "Chinese (Simplified)", og: "zh_CN" },
  ja: { name: "日本語", english: "Japanese", og: "ja_JP" },
  ko: { name: "한국어", english: "Korean", og: "ko_KR" },
  ar: { name: "العربية", english: "Arabic", og: "ar_AR", rtl: true },
  hi: { name: "हिन्दी", english: "Hindi", og: "hi_IN" },
};

/** Languages the build script translates in advance (everything except German source and the hand-written English). */
export const PREBUILT_CODES = Object.keys(LANGUAGES).filter((c) => c !== "de" && c !== "en");

/** Offered in the live-translation menu. Any other language can be typed in. */
export const LIVE_LANGUAGES = [
  "Afrikaans", "Albanian", "Amharic", "Armenian", "Azerbaijani", "Basque", "Belarusian", "Bengali", "Bosnian", "Bulgarian",
  "Catalan", "Croatian", "Czech", "Danish", "Estonian", "Filipino", "Finnish", "Galician", "Georgian", "Greek", "Gujarati",
  "Hebrew", "Hungarian", "Icelandic", "Indonesian", "Irish", "Kannada", "Kazakh", "Latvian", "Lithuanian", "Macedonian",
  "Malay", "Malayalam", "Marathi", "Mongolian", "Nepali", "Norwegian", "Persian", "Punjabi", "Romanian", "Serbian",
  "Sinhala", "Slovak", "Slovenian", "Swahili", "Swedish", "Tamil", "Telugu", "Thai", "Urdu", "Uzbek", "Vietnamese", "Welsh", "Zulu",
] as const;

export const RTL_ENGLISH_NAMES = ["Arabic", "Hebrew", "Persian", "Urdu"];

export function localePath(lang: string, path: string): string {
  if (lang === DEFAULT_LOCALE) return path;
  return path === "/" ? `/${lang}/` : `/${lang}${path}`;
}

/** Remove a leading "/<lang>" from a pathname (works for the current language and any known code). */
export function stripLocale(pathname: string): string {
  const m = pathname.match(/^\/([a-z]{2,3})(\/.*)?$/);
  if (m && m[1] in LANGUAGES && m[1] !== DEFAULT_LOCALE) return m[2] ?? "/";
  return pathname;
}
