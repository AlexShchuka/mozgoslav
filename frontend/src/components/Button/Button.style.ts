import styled, { css } from "styled-components";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const sizeStyles = {
  sm: css`
    height: 28px;
    padding: 0 ${({ theme }) => theme.space(2.5)};
    font-size: ${({ theme }) => theme.font.size.sm};
  `,
  md: css`
    height: 34px;
    padding: 0 ${({ theme }) => theme.space(3.5)};
    font-size: ${({ theme }) => theme.font.size.md};
  `,
  lg: css`
    height: 42px;
    padding: 0 ${({ theme }) => theme.space(5)};
    font-size: ${({ theme }) => theme.font.size.lg};
  `,
} satisfies Record<ButtonSize, ReturnType<typeof css>>;

const variantStyles = {
  primary: css`
    background: ${({ theme }) => theme.colors.accent};
    color: ${({ theme }) => theme.colors.accentContrast};
    &:hover:not(:disabled) {
      filter: brightness(1.05);
    }
  `,
  secondary: css`
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    border: 1px solid ${({ theme }) => theme.colors.border};
    &:hover:not(:disabled) {
      border-color: ${({ theme }) => theme.colors.accent};
      color: ${({ theme }) => theme.colors.accent};
    }
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.colors.textMuted};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.colors.accentSoft};
      color: ${({ theme }) => theme.colors.accent};
    }
  `,
  danger: css`
    background: ${({ theme }) => theme.colors.error};
    color: #fff;
    &:hover:not(:disabled) {
      filter: brightness(1.05);
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
  transition: background ${({ theme }) => theme.motion.fast},
    color ${({ theme }) => theme.motion.fast},
    filter ${({ theme }) => theme.motion.fast},
    border-color ${({ theme }) => theme.motion.fast};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focusRing};
    outline-offset: 2px;
    box-shadow: inset 0 0 0 2px ${({ theme }) => theme.colors.accent};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    pointer-events: none;
    transition: none;
  }

  .mg-icon {
    display: inline-flex;
    align-items: center;
  }

  ${({ $size }) => sizeStyles[$size]}
  ${({ $variant }) => variantStyles[$variant]}
`;
