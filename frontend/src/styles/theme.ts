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
    size: { xs: string; sm: string; md: string; lg: string; xl: string; xxl: string };
    weight: { regular: number; medium: number; semibold: number; bold: number };
  };
  shadow: { sm: string; md: string; lg: string };
  motion: { fast: string; base: string; slow: string };
}

const sharedTypography = {
  family:
    '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Helvetica, Arial, sans-serif',
  familyMono: 'ui-monospace, "JetBrains Mono", Menlo, monospace',
  size: { xs: "11px", sm: "13px", md: "14px", lg: "16px", xl: "20px", xxl: "26px" },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
};

const sharedRadii = { sm: "6px", md: "10px", lg: "16px", full: "999px" };

export const lightTheme: Theme = {
  mode: "light",
  colors: {
    bg: "#f7f8fa",
    surface: "#ffffff",
    surfaceElevated: "#ffffff",
    border: "#e6e8ec",
    text: "#11131a",
    textMuted: "#5a6072",
    textSubtle: "#8b93a7",
    accent: "#7c3aed",
    accentSoft: "#ede9fe",
    accentContrast: "#ffffff",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",
    focusRing: "rgba(124, 58, 237, 0.4)",
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
    bg: "#0b0d12",
    surface: "#11141b",
    surfaceElevated: "#161a23",
    border: "#22263048",
    text: "#ecedef",
    textMuted: "#a5adc2",
    textSubtle: "#6b7280",
    accent: "#a78bfa",
    accentSoft: "#2d2154",
    accentContrast: "#0b0d12",
    success: "#34d399",
    warning: "#fbbf24",
    error: "#f87171",
    info: "#60a5fa",
    focusRing: "rgba(167, 139, 250, 0.4)",
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
