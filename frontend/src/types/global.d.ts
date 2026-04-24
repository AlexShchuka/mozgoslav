import type { MozgoslavBridge } from "../../electron/preload";
import type { ThemeMode } from "../styles/theme";

declare global {
  interface Window {
    mozgoslav: MozgoslavBridge;
    __mozgoslavSetThemeMode?: (next: ThemeMode) => void;
  }
}

export {};
