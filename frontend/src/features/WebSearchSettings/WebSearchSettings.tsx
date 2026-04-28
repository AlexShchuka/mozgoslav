import { type FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import Button from "../../components/Button";
import Card from "../../components/Card";
import type { WebSearchConfig } from "../../store/slices/webSearch/types";
import type { WebSearchSettingsProps } from "./types";
import {
  EngineGrid,
  EngineRow,
  PrivacyDisclaimer,
  RawYamlPre,
  SaveNote,
  SectionTitle,
  SliderLabel,
  SliderRow,
  SliderValue,
  Toolbar,
} from "./WebSearchSettings.style";

const DEFAULT_CONFIG: WebSearchConfig = {
  ddgEnabled: true,
  yandexEnabled: true,
  googleEnabled: true,
  cacheTtlHours: 24,
  rawSettingsYaml: "",
};

const WebSearchSettings: FC<WebSearchSettingsProps> = ({
  config,
  isLoading,
  isSaving,
  onLoad,
  onSave,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<WebSearchConfig>(config ?? DEFAULT_CONFIG);

  useEffect(() => {
    onLoad();
  }, [onLoad]);

  useEffect(() => {
    if (config) {
      setDraft(config);
    }
  }, [config]);

  const toggle = (
    key: keyof Pick<WebSearchConfig, "ddgEnabled" | "yandexEnabled" | "googleEnabled">
  ) => setDraft((prev) => ({ ...prev, [key]: !prev[key] }));

  const setTtl = (hours: number) => setDraft((prev) => ({ ...prev, cacheTtlHours: hours }));

  return (
    <Card>
      <PrivacyDisclaimer>{t("webSearch.privacyDisclaimer")}</PrivacyDisclaimer>

      <SectionTitle>{t("webSearch.engines")}</SectionTitle>
      <EngineGrid>
        <EngineRow>
          <input
            type="checkbox"
            data-testid="websearch-ddg"
            checked={draft.ddgEnabled}
            onChange={() => toggle("ddgEnabled")}
          />
          {t("webSearch.engineDdg")}
        </EngineRow>
        <EngineRow>
          <input
            type="checkbox"
            data-testid="websearch-yandex"
            checked={draft.yandexEnabled}
            onChange={() => toggle("yandexEnabled")}
          />
          {t("webSearch.engineYandex")}
        </EngineRow>
        <EngineRow>
          <input
            type="checkbox"
            data-testid="websearch-google"
            checked={draft.googleEnabled}
            onChange={() => toggle("googleEnabled")}
          />
          {t("webSearch.engineGoogle")}
        </EngineRow>
      </EngineGrid>

      <SliderRow>
        <SliderLabel>{t("webSearch.cacheTtl")}</SliderLabel>
        <input
          type="range"
          min={1}
          max={72}
          value={draft.cacheTtlHours}
          data-testid="websearch-cache-ttl"
          onChange={(e) => setTtl(Number(e.target.value))}
        />
        <SliderValue>{draft.cacheTtlHours}h</SliderValue>
      </SliderRow>

      {isLoading || !draft.rawSettingsYaml ? null : (
        <>
          <SectionTitle>{t("webSearch.rawSettings")}</SectionTitle>
          <RawYamlPre>{draft.rawSettingsYaml}</RawYamlPre>
        </>
      )}

      <Toolbar>
        <SaveNote>{t("webSearch.saveNote")}</SaveNote>
        <Button variant="primary" isLoading={isSaving} onClick={() => onSave(draft)}>
          {t("common.save")}
        </Button>
      </Toolbar>
    </Card>
  );
};

export default WebSearchSettings;
