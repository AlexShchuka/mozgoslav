import styled, { keyframes } from "styled-components";

/**
 * Slow diagonal breathing used by the TitleBar. We animate `background-position`
 * rather than the gradient itself so there's no per-frame shader-paint cost —
 * the GPU simply pans the pre-composited gradient across an oversized canvas.
 */
const breathe = keyframes`
  0% { background-position: 0% 50%; }
  100% { background-position: 100% 50%; }
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
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors.accent.primary} 0%,
    ${({ theme }) => theme.colors.bg.elevated1} 100%
  );
  background-size: 200% 200%;
  animation: ${breathe} 9s ease-in-out infinite alternate;
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
