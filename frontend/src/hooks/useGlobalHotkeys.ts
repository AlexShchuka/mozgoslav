import { useHotkeys } from "react-hotkeys-hook";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "../constants/routes";

export const useGlobalHotkeys = (): void => {
  const navigate = useNavigate();

  useHotkeys("mod+comma", (e) => {
    e.preventDefault();
    navigate(ROUTES.settings);
  });

  useHotkeys("mod+shift+n", (e) => {
    e.preventDefault();
    if (window.mozgoslav) {
      void window.mozgoslav.openAudioFiles();
    }
  });
};
