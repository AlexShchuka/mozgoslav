import styled from "styled-components";

export const PageRoot = styled.div`
  padding: ${({ theme }) => theme.space(6)};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(4)};
`;

export const PageTitle = styled.h1`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.xxl};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

export const RowActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
`;

export const RowName = styled.div`
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  font-size: ${({ theme }) => theme.font.size.md};
  color: ${({ theme }) => theme.colors.text};
`;

export const RowDescription = styled.div`
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const RowBadges = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
`;

type RowComponent = React.FC<React.HTMLAttributes<HTMLDivElement>> & { Badges: typeof RowBadges };

const RowBase = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(3)} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child {
    border-bottom: 0;
  }
`;

// Tiny compound: Row.Badges
export const Row: RowComponent = Object.assign(RowBase, { Badges: RowBadges });

export const AppBindingsCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(4)};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`;

export const AppBindingsHeader = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

export const AppBindingsHint = styled.p`
  margin: 0 0 ${({ theme }) => theme.space(2)};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const AppBindingRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: ${({ theme }) => theme.space(2)};
  align-items: center;

  code {
    font-family: ${({ theme }) => theme.font.familyMono};
    font-size: ${({ theme }) => theme.font.size.sm};
    color: ${({ theme }) => theme.colors.textMuted};
    word-break: break-all;
  }
`;

export const BindingSelect = styled.select`
  height: 34px;
  padding: 0 ${({ theme }) => theme.space(2)};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.font.size.md};
`;
