import "i18next";
import type ruTranslation from "../locales/ru.json";

type TranslationResource = typeof ruTranslation;

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: TranslationResource;
    };
  }
}
