import "styled-components";

/**
 * Mozgoslav theme tokens. Two sibling themes (light, dark) share the shape so
 * styled-components `ThemeProvider` can be swapped without per-component logic.
 * Palette is muted + rounded with a single purple accent — Meetily-inspired
 * but neutral on branding.
 */
export interface Theme {
  mode: "light" | "dark";
  colors: {
    bg: string;
    surface: string;
    surfaceElevated: string;
    border: string;
    text: string;
    textMuted: string;
    textSubtle: string;
    accent: string;
    accentSoft: string;
    accentContrast: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    focusRing: string;
  };
  radii: { sm: string; md: string; lg: string; full: string };
  space: (n: number) => string;
  font: {
    family: string;
    familyMono: string;
    size: { xs: string; sm: string; md: string; lg: string; xl: string; xxl: string; hero: string };
    weight: { regular: number; medium: number; semibold: number; bold: number };
  };
  shadow: { sm: string; md: string; lg: string };
  motion: { fast: string; base: string; slow: string };
}

const sharedTypography = {
  family:
    '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Helvetica, Arial, sans-serif',
  familyMono: 'ui-monospace, "JetBrains Mono", Menlo, monospace',
  size: { xs: "12px", sm: "13px", md: "15px", lg: "19px", xl: "24px", xxl: "30px", hero: "39px" },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
};

const sharedRadii = { sm: "6px", md: "10px", lg: "16px", full: "999px" };

export const lightTheme: Theme = {
  mode: "light",
  colors: {
    bg: "#F5F5F7",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    border: "#E4E4E8",
    text: "#1D1D1F",
    textMuted: "#6E6E73",
    textSubtle: "#8E8E93",
    accent: "#0A84FF",
    accentSoft: "rgba(10, 132, 255, 0.12)",
    accentContrast: "#FFFFFF",
    success: "#34C759",
    warning: "#FF9F0A",
    error: "#FF375F",
    info: "#0A84FF",
    focusRing: "rgba(10, 132, 255, 0.45)",
  },
  radii: sharedRadii,
  space: (n) => `${n * 4}px`,
  font: sharedTypography,
  shadow: {
    sm: "0 1px 2px rgba(15, 23, 42, 0.06)",
    md: "0 4px 12px rgba(15, 23, 42, 0.08)",
    lg: "0 16px 40px rgba(15, 23, 42, 0.12)",
  },
  motion: { fast: "120ms", base: "200ms", slow: "320ms" },
};

export const darkTheme: Theme = {
  ...lightTheme,
  mode: "dark",
  colors: {
    bg: "#1C1C1E",
    surface: "#2C2C2E",
    surfaceElevated: "#3A3A3C",
    border: "rgba(255, 255, 255, 0.12)",
    text: "#F2F2F7",
    textMuted: "#AEAEB2",
    textSubtle: "#8E8E93",
    accent: "#0A84FF",
    accentSoft: "rgba(10, 132, 255, 0.2)",
    accentContrast: "#FFFFFF",
    success: "#34C759",
    warning: "#FF9F0A",
    error: "#FF375F",
    info: "#0A84FF",
    focusRing: "rgba(10, 132, 255, 0.55)",
  },
  shadow: {
    sm: "0 1px 2px rgba(0, 0, 0, 0.4)",
    md: "0 6px 16px rgba(0, 0, 0, 0.4)",
    lg: "0 20px 48px rgba(0, 0, 0, 0.5)",
  },
};

export type ThemeMode = "light" | "dark" | "system";

export const resolveSystemMode = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const pickTheme = (mode: ThemeMode): Theme =>
  (mode === "system" ? resolveSystemMode() : mode) === "dark" ? darkTheme : lightTheme;

declare module "styled-components" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends Theme {}
}
