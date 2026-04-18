import styled from "styled-components";

/**
 * Static gradient. Previously we panned `background-position` on a full-width
 * `linear-gradient` every frame for a "breathing" effect — but animating
 * `background-position` on gradients falls to CPU paint (compositor cannot
 * accelerate it), which means the browser repainted the entire top slab of
 * the window at 60fps and starved the main thread, surfacing as sluggish
 * clicks across the app. Static gradient keeps the look without the tax.
 *
 * Tint: a faint mint wash at the top-left corner (`accent.soft`) fades
 * through the theme's elevated backgrounds. Reads as "near-grey with the
 * barest hint of brand colour", matching the design ask to de-emphasise
 * the green.
 */
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
  background-image: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors.accent.soft} 0%,
    transparent 55%
  );
  -webkit-app-region: drag;
  user-select: none;
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
