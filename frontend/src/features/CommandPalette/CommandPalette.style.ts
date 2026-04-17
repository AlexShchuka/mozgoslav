import styled from "styled-components";

import { liquidGlass } from "../../styles/liquidGlass";

export const AnimatorShell = styled.div`
  ${liquidGlass}
  width: min(640px, 90vw);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadow.lg};
  overflow: hidden;
`;

export const SearchInput = styled.input`
  width: 100%;
  background: transparent;
  border: 0;
  outline: 0;
  padding: ${({ theme }) => `${theme.space(4)} ${theme.space(5)}`};
  font-family: inherit;
  font-size: ${({ theme }) => theme.font.size.lg};
  color: ${({ theme }) => theme.colors.text};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &::placeholder {
    color: ${({ theme }) => theme.colors.textSubtle};
  }
`;

export const ResultGroupTitle = styled.div`
  padding: ${({ theme }) => `${theme.space(2)} ${theme.space(4)}`};
  font-size: ${({ theme }) => theme.font.size.xs};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.textSubtle};
`;

export const ResultItemRoot = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2.5)};
  padding: ${({ theme }) => `${theme.space(2.5)} ${theme.space(4)}`};
  background: ${({ theme, $active }) => ($active ? theme.colors.accentSoft : "transparent")};
  color: ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.text)};
  font-size: ${({ theme }) => theme.font.size.md};
  cursor: pointer;

  span {
    flex: 1;
  }
`;

export const ResultShortcut = styled.span`
  flex: 0 !important;
  font-family: ${({ theme }) => theme.font.familyMono};
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.textSubtle};
  background: ${({ theme }) => theme.colors.bg};
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
`;
