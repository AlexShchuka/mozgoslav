import {useHotkeys} from "react-hotkeys-hook";
import {useNavigate} from "react-router-dom";

import {ROUTES} from "../constants/routes";

/**
 * Binds the app-wide hotkeys. Cmd+K (command palette) is handled inside the
 * palette itself; this hook covers the rest.
 */
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
