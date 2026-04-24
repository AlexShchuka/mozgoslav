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
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const Tabs = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space(1)};
  padding: ${({ theme }) => theme.space(1)};
  background: ${({ theme }) => theme.colors.bg.elevated2};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  align-self: flex-start;
`;

export const Tab = styled.button<{ $active: boolean }>`
  border: 0;
  cursor: pointer;
  padding: ${({ theme }) => `${theme.space(1.5)} ${theme.space(3)}`};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.accent.primary : theme.colors.text.secondary};
  background: ${({ theme, $active }) => ($active ? theme.colors.accent.soft : "transparent")};
  border-radius: ${({ theme }) => theme.radii.sm};
  transition:
    background ${({ theme }) => theme.motion.duration.fast},
    color ${({ theme }) => theme.motion.duration.fast};
  font-family: inherit;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

export const FormGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(4)};
  grid-template-columns: 1fr 1fr;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }

  label {
    display: block;
    margin-bottom: ${({ theme }) => theme.space(1.5)};
    font-size: ${({ theme }) => theme.font.size.sm};
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

export const Row = styled.div`
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.space(2)};
  grid-column: 1 / -1;

  & > div {
    flex: 1;
  }
`;

export const SelectBox = styled.select`
  width: 100%;
  height: 40px;
  padding: 0 ${({ theme }) => theme.space(3)};
  background: ${({ theme }) => theme.colors.bg.elevated2};
  color: ${({ theme }) => theme.colors.text.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  font-family: inherit;
  font-size: ${({ theme }) => theme.font.size.md};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focusRing};
    outline-offset: 2px;
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

export const SelectOption = styled.option`
  background: ${({ theme }) => theme.colors.bg.elevated2};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const Toolbar = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space(2)};
`;

export const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.text.primary};
`;
