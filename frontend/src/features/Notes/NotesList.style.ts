import styled from "styled-components";

export const PageRoot = styled.div`
  padding: ${({ theme }) => theme.space(6)};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(5)};
`;

export const PageTitle = styled.h1`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.xxl};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.01em;
`;

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
  flex-wrap: wrap;
`;

export const ToolbarActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
`;

export const MetaLine = styled.span`
  font-variant-numeric: tabular-nums;
`;

export const FieldLabel = styled.label`
  display: block;
  margin: ${({ theme }) => theme.space(3)} 0 ${({ theme }) => theme.space(1)};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.text.secondary};

  &:first-child {
    margin-top: 0;
  }
`;

export const BodyField = styled.textarea`
  width: 100%;
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg.elevated2};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: ${({ theme }) => theme.font.familyMono};
  font-size: ${({ theme }) => theme.font.size.sm};
  resize: vertical;
  min-height: 160px;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focusRing};
  }
`;
