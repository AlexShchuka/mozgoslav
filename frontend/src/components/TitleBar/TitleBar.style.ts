import styled, { keyframes } from "styled-components";

/**
 * Slow diagonal breathing on a `::before` pseudo-element using
 * `transform: translate3d(...)`. Transforms are compositor-accelerated — the
 * browser promotes the pseudo to its own GPU layer (hinted via
 * `will-change`) and pans it without repainting. Animating the gradient's
 * `background-position` directly — our previous implementation — falls to
 * CPU paint on every frame across the full-width bar, starving the main
 * thread and surfacing as click lag across the app. This version costs the
 * main thread nothing.
 *
 * Layout: root holds the flat base colour + drag region. The pseudo sits
 * behind content (`z-index: -1` inside an `isolation: isolate` stacking
 * context) and extends 50% beyond each edge so the pan has room to travel
 * without exposing empty corners. Gradient fades mint-soft → transparent →
 * transparent → mint-soft so as the pseudo slides, a muted accent band
 * drifts diagonally across the bar and back.
 */
const breathe = keyframes`
  0%   { transform: translate3d(-12%, -6%, 0); }
  100% { transform: translate3d(12%, 6%, 0); }
`;

export const TitleBarRoot = styled.header`
  grid-column: 1 / -1;
  height: 44px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space(2)};
  /* 78 px left reservation keeps the macOS traffic-light buttons
     (titleBarStyle: "hiddenInset") clear of bar content. */
  padding: 0 ${({ theme }) => theme.space(4)} 0 78px;
  color: ${({ theme }) => theme.colors.text.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background-color: ${({ theme }) => theme.colors.bg.elevated2};
  position: relative;
  overflow: hidden;
  isolation: isolate;
  -webkit-app-region: drag;
  user-select: none;

  &::before {
    content: "";
    position: absolute;
    inset: -50%;
    z-index: -1;
    pointer-events: none;
    background: linear-gradient(
      135deg,
      ${({ theme }) => theme.colors.accent.soft} 0%,
      transparent 45%,
      transparent 55%,
      ${({ theme }) => theme.colors.accent.soft} 100%
    );
    animation: ${breathe} 9s ease-in-out infinite alternate;
    will-change: transform;
  }
`;

export const TitleBarLabel = styled.span`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  letter-spacing: 0.02em;
`;

export const TitleBarIconSlot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;
