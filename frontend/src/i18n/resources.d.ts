import "i18next";
import type ruTranslation from "../locales/ru.json";

/**
 * Compile-time typing for i18next keys.
 *
 * We infer the key shape from the Russian (default) locale JSON. `t("foo.bar")`
 * with a missing key becomes a TS error — the type of `t` narrows the string
 * argument to paths that exist on `TranslationResource`.
 *
 * `defaultNS: "translation"` mirrors `src/i18n/index.ts` where each locale is
 * registered under the `translation` namespace.
 *
 * English locale may drift during development; typing off `ru.json` is the
 * pragmatic default (any key a Russian user sees must exist).
 */
type TranslationResource = typeof ruTranslation;

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: TranslationResource;
    };
  }
}
