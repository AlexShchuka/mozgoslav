import styled, { css } from "styled-components";

export const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1)};
`;

export const Field = styled.div<{ $recording: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => `${theme.space(2)} ${theme.space(3)}`};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg.elevated2};
  min-height: 40px;
  cursor: pointer;
  outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease;

  &:focus,
  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }

  ${({ $recording, theme }) =>
    $recording
      ? css`
          border-color: ${theme.colors.accent.primary};
          box-shadow: 0 0 0 2px ${theme.colors.accent.soft};
        `
      : ""}
`;

export const Placeholder = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

export const Value = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1)};
  font-family: ${({ theme }) => theme.font.familyMono};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space(2)};
`;

export const Hint = styled.div`
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;
