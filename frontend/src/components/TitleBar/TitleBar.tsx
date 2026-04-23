import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

import { TitleBarIconSlot, TitleBarLabel, TitleBarRoot } from "./TitleBar.style";

const TitleBar: FC = () => {
  const { t } = useTranslation();

  return (
    <TitleBarRoot>
      <TitleBarIconSlot>
        <Sparkles size={14} aria-hidden="true" />
      </TitleBarIconSlot>
      <TitleBarLabel>{t("app.name")}</TitleBarLabel>
    </TitleBarRoot>
  );
};

export default TitleBar;
