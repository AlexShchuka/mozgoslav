import { FC, useEffect } from "react";
import { useTranslation } from "react-i18next";

import type { SystemActionsProps } from "./types";
import {
  ErrorMessage,
  ImportButton,
  PageTitle,
  Subtitle,
  SystemActionsRoot,
  TemplateDescription,
  TemplateItem,
  TemplateList,
  TemplateName,
} from "./SystemActions.style";

const SystemActions: FC<SystemActionsProps> = ({ templates, isLoading, error, onLoad }) => {
  const { t } = useTranslation();

  useEffect(() => {
    onLoad();
  }, [onLoad]);

  return (
    <SystemActionsRoot>
      <PageTitle>{t("systemActions.title")}</PageTitle>
      <Subtitle>{t("systemActions.subtitle")}</Subtitle>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {isLoading && <Subtitle>{t("systemActions.loading")}</Subtitle>}
      {!isLoading && !error && (
        <TemplateList>
          {templates.map((template) => (
            <TemplateItem key={template.name}>
              <TemplateName>{template.name}</TemplateName>
              <TemplateDescription>{template.description}</TemplateDescription>
              <ImportButton href={template.deeplinkUrl} target="_blank" rel="noreferrer">
                {t("systemActions.import")}
              </ImportButton>
            </TemplateItem>
          ))}
        </TemplateList>
      )}
    </SystemActionsRoot>
  );
};

export default SystemActions;
