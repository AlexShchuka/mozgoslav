import styled from "styled-components";

export const InputLabel = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: ${({ theme }) => theme.space(1.5)};
`;

export const InputRow = styled.div<{ $hasError: boolean }>`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme, $hasError }) => ($hasError ? theme.colors.error : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.md};
  transition: border-color ${({ theme }) => theme.motion.fast};

  &:focus-within {
    border-color: ${({ theme, $hasError }) => ($hasError ? theme.colors.error : theme.colors.accent)};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing};
  }
`;

export const InputField = styled.input`
  flex: 1;
  background: transparent;
  border: 0;
  outline: 0;
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => `${theme.space(2.25)} ${theme.space(3)}`};
  font-size: ${({ theme }) => theme.font.size.md};
  font-family: inherit;
  min-width: 0;

  &::placeholder {
    color: ${({ theme }) => theme.colors.textSubtle};
  }
`;

export const ToggleButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: ${({ theme }) => theme.space(2)};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radii.sm};
  transition: color ${({ theme }) => theme.motion.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.accent};
  }
`;

export const Hint = styled.p`
  margin: ${({ theme }) => theme.space(1.5)} 0 0;
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.textSubtle};
`;

export const Error = styled.p`
  margin: ${({ theme }) => theme.space(1.5)} 0 0;
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.error};
`;
