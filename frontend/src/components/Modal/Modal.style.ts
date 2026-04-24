import styled from "styled-components";

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgb(10, 12, 18, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.space(6)};
  z-index: 900;
`;

export const Dialog = styled.div`
  background: ${({ theme }) => theme.colors.bg.elevated3};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadow.lg};
  max-width: 92vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => `${theme.space(4)} ${theme.space(5)}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

export const Title = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.space(1.5)};
  background: transparent;
  border: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  transition:
    background ${({ theme }) => theme.motion.duration.fast},
    color ${({ theme }) => theme.motion.duration.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.bg.base};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

export const Body = styled.div`
  padding: ${({ theme }) => theme.space(5)};
  overflow: auto;
  flex: 1;
`;

export const Footer = styled.footer`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => `${theme.space(3)} ${theme.space(5)}`};
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background: ${({ theme }) => theme.colors.bg.base};
`;
