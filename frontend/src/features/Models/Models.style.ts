import styled from "styled-components";

export const PageRoot = styled.div`
  padding: ${({ theme }) => theme.space(6)};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(4)};
`;

export const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(2)};
`;

export const FilterChip = styled.button<{ active: boolean }>`
  padding: ${({ theme }) => `${theme.space(1)} ${theme.space(3)}`};
  border-radius: 999px;
  border: 1px solid
    ${({ theme, active }) => (active ? theme.colors.accent.primary : theme.colors.border.subtle)};
  background: ${({ theme, active }) => (active ? theme.colors.accent.primary : "transparent")};
  color: ${({ theme, active }) =>
    active ? theme.colors.accent.contrast : theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.font.size.sm};
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

export const GroupHeading = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
  padding-bottom: ${({ theme }) => theme.space(1)};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

export const PageTitle = styled.h1`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.xxl};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const Subtitle = styled.p`
  margin: ${({ theme }) => theme.space(1)} 0 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.font.size.md};
`;

export const ModelCard = styled.div`
  display: flex;
  flex-direction: column;
`;

export const ModelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
`;

export const ModelMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1)};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.font.size.sm};

  code {
    font-size: ${({ theme }) => theme.font.size.xs};
    color: ${({ theme }) => theme.colors.text.muted};
    word-break: break-all;
  }
`;
