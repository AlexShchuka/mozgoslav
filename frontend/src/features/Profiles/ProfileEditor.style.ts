import styled from "styled-components";

export const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(4)};

  label {
    display: block;
    margin-bottom: ${({ theme }) => theme.space(1.5)};
    font-size: ${({ theme }) => theme.font.size.sm};
    color: ${({ theme }) => theme.colors.text.secondary};
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

export const TextArea = styled.textarea`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg.elevated2};
  color: ${({ theme }) => theme.colors.text.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.space(2.5)};
  font-family: ${({ theme }) => theme.font.familyMono};
  font-size: ${({ theme }) => theme.font.size.sm};
  resize: vertical;
  min-height: 80px;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focusRing};
    outline-offset: 2px;
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

export const TagEditor = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(1.5)};
  align-items: center;
  padding: ${({ theme }) => theme.space(2)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};

  > div {
    flex: 1;
    min-width: 120px;
  }
`;

export const TagPill = styled.button`
  border: 0;
  background: ${({ theme }) => theme.colors.accent.soft};
  color: ${({ theme }) => theme.colors.accent.primary};
  padding: ${({ theme }) => `${theme.space(1)} ${theme.space(2)}`};
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: ${({ theme }) => theme.font.size.xs};
  font-family: inherit;
  cursor: pointer;

  &:hover {
    filter: brightness(1.05);
  }
`;

export const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};

  input {
    cursor: pointer;
  }

  label {
    margin: 0;
    cursor: pointer;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

export const FieldError = styled.div`
  margin-top: ${({ theme }) => `-${theme.space(3)}`};
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.font.size.xs};
`;
