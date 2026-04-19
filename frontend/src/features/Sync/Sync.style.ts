import styled from "styled-components";

export const PageRoot = styled.div`
  padding: ${({theme}) => theme.space(6)};
  display: flex;
  flex-direction: column;
  gap: ${({theme}) => theme.space(4)};
`;

export const PageTitle = styled.h1`
  margin: 0;
  font-size: ${({theme}) => theme.font.size.xxl};
  font-weight: ${({theme}) => theme.font.weight.semibold};
  color: ${({theme}) => theme.colors.text.primary};
`;

export const TabBar = styled.div`
  display: flex;
  gap: ${({theme}) => theme.space(1)};
  border-bottom: 1px solid ${({theme}) => theme.colors.border.subtle};
`;

export const TabButton = styled.button<{ $active: boolean }>`
  appearance: none;
  background: transparent;
  border: 0;
  padding: ${({theme}) => theme.space(2.5)} ${({theme}) => theme.space(3)};
  font: inherit;
  font-size: ${({theme}) => theme.font.size.sm};
  color: ${({theme, $active}) => ($active ? theme.colors.accent.primary : theme.colors.text.secondary)};
  border-bottom: 2px solid
    ${({theme, $active}) => ($active ? theme.colors.accent.primary : "transparent")};
  cursor: pointer;

  &:hover {
    color: ${({theme}) => theme.colors.accent.primary};
  }
`;

export const SubViewRoot = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({theme}) => theme.space(3)};
`;

export const DeviceRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({theme}) => theme.space(3)};
  padding: ${({theme}) => theme.space(2)} 0;
  border-bottom: 1px solid ${({theme}) => theme.colors.border.subtle};
  &:last-child {
    border-bottom: 0;
  }
`;

export const FolderRow = styled(DeviceRow)`
  align-items: flex-start;
`;

export const ConflictBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({theme}) => theme.space(1)};
  padding: 2px ${({theme}) => theme.space(1.5)};
  border-radius: ${({theme}) => theme.radii.full};
  background: ${({theme}) => theme.colors.warning};
  color: #fff;
  font-size: ${({theme}) => theme.font.size.xs};
`;

export const EmptyLine = styled.p`
  margin: 0;
  color: ${({theme}) => theme.colors.text.secondary};
  font-size: ${({theme}) => theme.font.size.sm};
`;

export const ToggleRow = styled.label`
  display: flex;
  align-items: center;
  gap: ${({theme}) => theme.space(2)};
  font-size: ${({theme}) => theme.font.size.md};
  color: ${({theme}) => theme.colors.text.primary};
`;
