import styled, { css } from "styled-components";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "error" | "info";

const tones = {
  neutral: css`
    color: ${({ theme }) => theme.colors.text.secondary};
    background: ${({ theme }) => theme.colors.border.subtle};
  `,
  accent: css`
    color: ${({ theme }) => theme.colors.accent.primary};
    background: ${({ theme }) => theme.colors.accent.soft};
  `,
  success: css`
    color: ${({ theme }) => theme.colors.success};
    background: rgb(16, 185, 129, 0.14);
  `,
  warning: css`
    color: ${({ theme }) => theme.colors.warning};
    background: rgb(245, 158, 11, 0.14);
  `,
  error: css`
    color: ${({ theme }) => theme.colors.error};
    background: rgb(239, 68, 68, 0.14);
  `,
  info: css`
    color: ${({ theme }) => theme.colors.info};
    background: rgb(59, 130, 246, 0.14);
  `,
} satisfies Record<BadgeTone, ReturnType<typeof css>>;

export const Root = styled.span<{ $tone: BadgeTone }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1)};
  padding: ${({ theme }) => `${theme.space(0.5)} ${theme.space(2)}`};
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  ${({ $tone }) => tones[$tone]}
`;
