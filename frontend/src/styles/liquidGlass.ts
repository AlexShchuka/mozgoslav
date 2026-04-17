import { css } from "styled-components";

/**
 * ADR-006 D-4: macOS-26/Tahoe Liquid Glass chrome.
 *
 * Hand-rolled — no `liquid-glass-react` dep — because every surface that
 * wants the effect today (sidebar, modal backdrop) only needs the blur +
 * saturate + rim highlight combo. The ADR allows pulling in the react lib
 * for a refraction-shaded hero CTA later; until we build one we don't pay
 * the bundle / runtime cost.
 *
 * On engines without `backdrop-filter: blur` (notably Linux dev boxes with
 * software WebGL) `@supports not` falls back to an opaque translucent fill
 * so the chrome stays legible instead of flickering.
 */
export const liquidGlass = css`
  position: relative;
  background: ${({ theme }) => `${theme.colors.surface}80`};
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  isolation: isolate;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.18);
    background: radial-gradient(
      circle at 20% 0%,
      rgba(255, 255, 255, 0.12),
      transparent 55%
    );
    mix-blend-mode: screen;
  }

  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    background: ${({ theme }) => theme.colors.surfaceElevated};
    &::before { display: none; }
  }
`;

/** Full-screen tinted backdrop (modal / command palette). */
export const liquidGlassBackdrop = css`
  background: rgba(10, 12, 18, 0.35);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);

  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    background: rgba(10, 12, 18, 0.72);
  }
`;
