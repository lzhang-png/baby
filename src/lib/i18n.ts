import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import en from "@/locales/en"
import zh from "@/locales/zh"
import { safeGetItem, safeSetItem } from "@/lib/safe-storage"

export type AppLocale = "en" | "zh"

const STORAGE_KEY = "baby-locale"

function getStoredLocale(): AppLocale {
  const stored = safeGetItem(STORAGE_KEY)
  return stored === "en" || stored === "zh" ? stored : "zh"
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: getStoredLocale(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
})

function syncDocumentTitle() {
  document.title = i18n.t("common.appName")
}

syncDocumentTitle()
i18n.on("languageChanged", syncDocumentTitle)

export function getDateLocale(language = i18n.language): string {
  return language === "zh" ? "zh-CN" : "en-US"
}

export function setAppLanguage(locale: AppLocale) {
  void i18n.changeLanguage(locale)
  safeSetItem(STORAGE_KEY, locale)
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en"
  syncDocumentTitle()
}

document.documentElement.lang =
  getStoredLocale() === "zh" ? "zh-CN" : "en"

export default i18n
