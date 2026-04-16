import React, { FC, PropsWithChildren, useEffect, useState } from "react";
import { ThemeProvider as StyledThemeProvider } from "styled-components";

import { darkTheme, lightTheme, pickTheme, resolveSystemMode, Theme, ThemeMode } from "./theme";
import { GlobalStyle } from "./GlobalStyle";

const THEME_STORAGE_KEY = "mozgoslav:themeMode";

const readStoredMode = (): ThemeMode => {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
};

const MozgoslavThemeProvider: FC<PropsWithChildren> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => readStoredMode());
  const [theme, setTheme] = useState<Theme>(() => pickTheme(readStoredMode()));

  useEffect(() => {
    setTheme(pickTheme(mode));
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

  // React to system color-scheme changes when user picked "system".
  useEffect(() => {
    if (mode !== "system" || typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setTheme(resolveSystemMode() === "dark" ? darkTheme : lightTheme);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [mode]);

  // Expose a setter via window so Settings can flip theme — avoids coupling to Redux here.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__mozgoslavSetThemeMode = setMode;
  }, []);

  return (
    <StyledThemeProvider theme={theme}>
      <GlobalStyle />
      {children}
    </StyledThemeProvider>
  );
};

export const setThemeMode = (next: ThemeMode): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__mozgoslavSetThemeMode?.(next);
};

export default MozgoslavThemeProvider;
