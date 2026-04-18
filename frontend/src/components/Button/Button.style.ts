import styled, { css } from "styled-components";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
export type ButtonSize = "sm" | "md" | "lg";

const sizeStyles = {
  sm: css`
    height: 28px;
    padding: 0 ${({ theme }) => theme.space(2.5)};
    font-size: ${({ theme }) => theme.font.size.sm};
  `,
  md: css`
    height: 36px;
    padding: 0 ${({ theme }) => theme.space(3.5)};
    font-size: ${({ theme }) => theme.font.size.md};
  `,
  lg: css`
    height: 44px;
    padding: 0 ${({ theme }) => theme.space(5)};
    font-size: ${({ theme }) => theme.font.size.lg};
  `,
} satisfies Record<ButtonSize, ReturnType<typeof css>>;

const variantStyles = {
  /* Resting state is deliberately muted — tinted fill + accent border — so
     primary affordances don't overwhelm the surrounding layout. Hover
     promotes the button to the full accent gradient + glow (the previous
     resting look) to make the affordance unmistakable at the moment of
     interaction. */
  primary: css`
    background: ${({ theme }) => theme.colors.accent.soft};
    color: ${({ theme }) => theme.colors.accent.primary};
    border: 1px solid ${({ theme }) => theme.colors.accent.primary};
    &:hover:not(:disabled) {
      background: linear-gradient(
        135deg,
        ${({ theme }) => theme.colors.accent.primary} 0%,
        ${({ theme }) => theme.colors.accent.secondary} 100%
      );
      color: ${({ theme }) => theme.colors.accent.contrast};
      box-shadow: ${({ theme }) => theme.shadow.accent};
    }
  `,
  secondary: css`
    background: ${({ theme }) => theme.colors.bg.elevated2};
    color: ${({ theme }) => theme.colors.text.primary};
    border: 1px solid ${({ theme }) => theme.colors.border.subtle};
    &:hover:not(:disabled) {
      border-color: ${({ theme }) => theme.colors.accent.primary};
      color: ${({ theme }) => theme.colors.accent.primary};
    }
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.colors.text.secondary};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.colors.accent.soft};
      color: ${({ theme }) => theme.colors.accent.primary};
    }
  `,
  /* Same resting-muted / hover-intensifies pattern as primary, but with the
     error palette. Tinted fill is defined inline because the theme exposes
     only the solid `error` colour; adding an `error.soft` token would
     require a theme contract change for a single use-site. */
  danger: css`
    background: rgba(248, 113, 113, 0.12);
    color: ${({ theme }) => theme.colors.error};
    border: 1px solid ${({ theme }) => theme.colors.error};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.colors.error};
      color: #fff;
      box-shadow: 0 0 0 1px rgba(248, 113, 113, 0.35),
        0 8px 24px rgba(248, 113, 113, 0.18);
    }
  `,
  /* Confirmatory resting state — used for "already installed / already done"
     affordances that should stay visible but not invite another click. Pair
     with `disabled` on the element so pointer-events are off. */
  success: css`
    background: ${({ theme }) => theme.colors.success};
    color: ${({ theme }) => theme.colors.accent.contrast};
    &:disabled {
      opacity: 1;
      cursor: default;
    }
  `,
} satisfies Record<ButtonVariant, ReturnType<typeof css>>;

export const StyledButton = styled.button<{ $variant: ButtonVariant; $size: ButtonSize }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  border: 0;
  border-radius: ${({ theme }) => theme.radii.md};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  cursor: pointer;
  user-select: none;
  transition: background ${({ theme }) => theme.motion.duration.fast},
    color ${({ theme }) => theme.motion.duration.fast},
    filter ${({ theme }) => theme.motion.duration.fast},
    box-shadow ${({ theme }) => theme.motion.duration.fast},
    border-color ${({ theme }) => theme.motion.duration.fast};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focusRing};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .mg-icon {
    display: inline-flex;
    align-items: center;
  }

  ${({ $size }) => sizeStyles[$size]}
  ${({ $variant }) => variantStyles[$variant]}
`;
