import "styled-components";

export interface MotionSpringTokens {
    type: "spring";
    stiffness: number;
    damping: number;
}

export interface Theme {
    mode: "light" | "dark";
    colors: {
        bg: {
            base: string;
            elevated1: string;
            elevated2: string;
            elevated3: string;
        };
        border: {
            subtle: string;
            strong: string;
        };
        text: {
            primary: string;
            secondary: string;
            muted: string;
        };
        accent: {
            primary: string;
            secondary: string;
            soft: string;
            contrast: string;
            glow: string;
        };
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
    shadow: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        accent: string;
    };
    motion: {
        duration: {
            instant: string;
            fast: string;
            base: string;
            slow: string;
        };
        easing: {
            standard: string;
            emphasized: string;
            spring: { soft: MotionSpringTokens; firm: MotionSpringTokens };
        };
    };
}

const sharedTypography = {
    family:
        '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Helvetica, Arial, sans-serif',
    familyMono: 'ui-monospace, "JetBrains Mono", Menlo, monospace',
    size: {xs: "12px", sm: "14px", md: "15px", lg: "17px", xl: "20px", xxl: "26px"},
    weight: {regular: 500, medium: 600, semibold: 600, bold: 700},
};

const sharedRadii = {sm: "6px", md: "10px", lg: "16px", full: "999px"};

const sharedMotion = {
    duration: {
        instant: "80ms",
        fast: "150ms",
        base: "220ms",
        slow: "360ms",
    },
    easing: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
        emphasized: "cubic-bezier(0.3, 0, 0.1, 1)",
        spring: {
            soft: {type: "spring", stiffness: 260, damping: 28} satisfies MotionSpringTokens,
            firm: {type: "spring", stiffness: 420, damping: 32} satisfies MotionSpringTokens,
        },
    },
} as const;


const darkBg = {
    base: "#0c0c14",
    elevated1: "#121219",
    elevated2: "#1a1a24",
    elevated3: "#22222e",
} as const;

const darkBorder = {
    subtle: "#22222e",
    strong: "#3a3a4a",
} as const;

const darkText = {
    primary: "#ecedef",
    secondary: "#a5adc2",
    muted: "#6b7280",
} as const;

const darkAccent = {
    primary: "#29fcc3",
    secondary: "#0bd4cd",
    soft: "rgba(41, 252, 195, 0.12)",
    contrast: "#0c0c14",
    glow: "rgba(41, 252, 195, 0.35)",
} as const;

export const darkTheme: Theme = {
    mode: "dark",
    colors: {
        bg: darkBg,
        border: darkBorder,
        text: darkText,
        accent: darkAccent,
        success: "#29fcc3",
        warning: "#fbbf24",
        error: "#f87171",
        info: "#60a5fa",
        focusRing: "rgba(41, 252, 195, 0.5)",
    },
    radii: sharedRadii,
    space: (n) => `${n * 4}px`,
    font: sharedTypography,
    shadow: {
        xs: "0 1px 2px rgba(0, 0, 0, 0.4)",
        sm: "0 4px 12px rgba(0, 0, 0, 0.4)",
        md: "0 10px 28px rgba(0, 0, 0, 0.5)",
        lg: "0 24px 56px rgba(0, 0, 0, 0.6)",
        accent:
            "0 0 0 1px rgba(41, 252, 195, 0.35), 0 8px 24px rgba(41, 252, 195, 0.18)",
    },
    motion: {
        duration: sharedMotion.duration,
        easing: sharedMotion.easing,
    },
};


const lightBg = {
    base: "#f7f8fa",
    elevated1: "#ffffff",
    elevated2: "#ffffff",
    elevated3: "#ffffff",
} as const;

const lightBorder = {
    subtle: "#e6e8ec",
    strong: "#c9cdd6",
} as const;

const lightText = {
    primary: "#0c0c14",
    secondary: "#5a6072",
    muted: "#8b93a7",
} as const;

const lightAccent = {
    primary: "#0bd4cd",
    secondary: "#29fcc3",
    soft: "rgba(11, 212, 205, 0.12)",
    contrast: "#ffffff",
    glow: "rgba(11, 212, 205, 0.35)",
} as const;

export const lightTheme: Theme = {
    mode: "light",
    colors: {
        bg: lightBg,
        border: lightBorder,
        text: lightText,
        accent: lightAccent,
        success: "#0bd4cd",
        warning: "#f59e0b",
        error: "#ef4444",
        info: "#3b82f6",
        focusRing: "rgba(11, 212, 205, 0.5)",
    },
    radii: sharedRadii,
    space: (n) => `${n * 4}px`,
    font: sharedTypography,
    shadow: {
        xs: "0 1px 2px rgba(15, 23, 42, 0.06)",
        sm: "0 4px 12px rgba(15, 23, 42, 0.08)",
        md: "0 10px 28px rgba(15, 23, 42, 0.12)",
        lg: "0 24px 56px rgba(15, 23, 42, 0.18)",
        accent:
            "0 0 0 1px rgba(11, 212, 205, 0.35), 0 8px 24px rgba(11, 212, 205, 0.18)",
    },
    motion: {
        duration: sharedMotion.duration,
        easing: sharedMotion.easing,
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
    export interface DefaultTheme extends Theme {
    }
}
