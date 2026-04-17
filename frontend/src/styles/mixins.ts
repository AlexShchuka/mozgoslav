import { css } from "styled-components";

/**
 * Canonical focus ring — WCAG 2.1 AA compliant. Use on every interactive
 * surface via &:focus-visible { ${focusRing} }. Two-ring strategy: 2px outline
 * at the theme's focusRing colour + 2px inset accent so the ring is visible on
 * both light AND dark surfaces, plus on top of existing borders.
 *
 * B9/B10: centralised here so new components do not drift.
 */
export const focusRing = css`
  outline: 2px solid ${({ theme }) => theme.colors.focusRing};
  outline-offset: 2px;
  box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.accent} inset;
`;

/**
 * Canonical disabled state — aligns with ADR-006 D-13:
 *   opacity 0.45, pointer-events none, animation halted.
 * Applied via `&:disabled { ${disabledState} }` or `&[aria-disabled="true"]`.
 */
export const disabledState = css`
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
  animation: none;
`;

/**
 * Respect prefers-reduced-motion: wrap motion-bearing CSS in this helper to
 * collapse it to a static state for users who opt out of animations.
 */
export const reducedMotionSafe = (animated: ReturnType<typeof css>) => css`
  @media (prefers-reduced-motion: no-preference) {
    ${animated}
  }
`;
