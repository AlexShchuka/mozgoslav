import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

import { TitleBarIconSlot, TitleBarLabel, TitleBarRoot } from "./TitleBar.style";

/**
 * Chrome-less window titlebar for the main BrowserWindow.
 *
 * - Spans the full window width and serves as the primary
 *   `-webkit-app-region: drag` target (Electron hiddenInset mode).
 * - Pads 78 px on the left so macOS traffic-light buttons have room.
 * - Background is a slow diagonal "breathing" gradient between the accent
 *   green and the neutral elevated-1 surface — see `TitleBar.style.ts`.
 */
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
