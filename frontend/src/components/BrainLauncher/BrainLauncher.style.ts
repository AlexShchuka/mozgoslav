import styled, { css, keyframes } from "styled-components";

import { disabledState, focusRing } from "../../styles/mixins";

export type BrainLauncherState = "idle" | "recording";
export type BrainLauncherSize = "tray" | "dock";

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const sizePx: Record<BrainLauncherSize, number> = { tray: 28, dock: 44 };

const gradients = {
  idle: css`
    background: linear-gradient(135deg, #64d2ff 0%, #0a84ff 50%, #5e5ce6 100%);
    box-shadow:
      0 0 24px rgba(10, 132, 255, 0.55),
      0 0 48px rgba(94, 92, 230, 0.35);
  `,
  recording: css`
    background: linear-gradient(135deg, #ff9f0a 0%, #ff375f 55%, #ff453a 100%);
    box-shadow:
      0 0 24px rgba(255, 55, 95, 0.6),
      0 0 48px rgba(255, 69, 58, 0.4);
  `,
};

export const LauncherButton = styled.button<{
  $state: BrainLauncherState;
  $size: BrainLauncherSize;
  $reduced: boolean;
}>`
  --launcher-size: ${({ $size }) => sizePx[$size]}px;
  width: var(--launcher-size);
  height: var(--launcher-size);
  border: 0;
  border-radius: 999px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  cursor: pointer;
  transition: background 280ms ease, box-shadow 280ms ease;
  ${({ $state }) => gradients[$state]}

  ${({ $reduced, $state }) =>
    !$reduced &&
    css`
      animation: ${pulse} ${$state === "recording" ? "0.8s" : "2.4s"} ease-in-out infinite;
    `}

  /* CSS-level belt-and-braces: even if the JS hook somehow fails to gate the
     animation, honour the user's OS-level preference. */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  &:focus-visible {
    ${focusRing}
  }

  &:disabled {
    ${disabledState}
  }
`;

export const IconSlot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25));
`;
