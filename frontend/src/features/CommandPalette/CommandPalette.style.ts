import styled from "styled-components";

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(10, 12, 18, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
  z-index: 1000;
`;

export const Palette = styled.div`
  width: min(640px, 90vw);
  background: ${({ theme }) => theme.colors.bg.elevated3};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadow.lg};
  overflow: hidden;
`;

export const Input = styled.input`
  width: 100%;
  background: transparent;
  border: 0;
  outline: 0;
  padding: ${({ theme }) => `${theme.space(4)} ${theme.space(5)}`};
  font-family: inherit;
  font-size: ${({ theme }) => theme.font.size.lg};
  color: ${({ theme }) => theme.colors.text.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

export const Section = styled.div`
  max-height: 360px;
  overflow: auto;
`;

export const ItemList = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.space(1)};
`;

export const Item = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2.5)};
  padding: ${({ theme }) => `${theme.space(2.5)} ${theme.space(3)}`};
  border: 0;
  background: ${({ theme, $active }) => ($active ? theme.colors.accent.soft : "transparent")};
  color: ${({ theme, $active }) => ($active ? theme.colors.accent.primary : theme.colors.text.primary)};
  border-radius: ${({ theme }) => theme.radii.md};
  font-family: inherit;
  font-size: ${({ theme }) => theme.font.size.md};
  cursor: pointer;
  text-align: left;
  transition: background ${({ theme }) => theme.motion.duration.fast};

  span {
    flex: 1;
  }
`;

export const ItemHint = styled.span`
  flex: 0 !important;
  font-family: ${({ theme }) => theme.font.familyMono};
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  background: ${({ theme }) => theme.colors.bg.base};
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
`;
