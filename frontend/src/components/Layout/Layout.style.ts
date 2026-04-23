import styled from "styled-components";

export const LayoutRoot = styled.div`
  display: grid;
  /* Row 1: draggable TitleBar (44 px). Row 2: sidebar + main content. */
  grid-template: 44px 1fr / 240px 1fr;
  height: 100vh;
  background: ${({ theme }) => theme.colors.bg.base};
`;

export const Sidebar = styled.aside`
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.space(4)};
  background: ${({ theme }) => theme.colors.bg.elevated2};
  border-right: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(2.5)};
  color: ${({ theme }) => theme.colors.accent.primary};
`;

export const AppName = styled.h1`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.01em;
`;

export const SidebarTitle = styled.h1`
  margin: 0 0 ${({ theme }) => theme.space(3)} 0;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const SidebarSection = styled.nav`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(5)};
  margin-top: ${({ theme }) => theme.space(5)};
  flex: 1;
  -webkit-app-region: no-drag;
`;

export const SidebarGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(0.5)};
`;

export const SidebarItem = styled.a`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2.5)};
  padding: ${({ theme }) => `${theme.space(2)} ${theme.space(2.5)}`};
  border-radius: ${({ theme }) => theme.radii.md};
  /* Sidebar body copy is one step larger than generic body text for
       navigation readability; 16px isn't in the token scale, inline on purpose. */
  font-size: 16px;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;
  transition:
    background ${({ theme }) => theme.motion.duration.fast},
    color ${({ theme }) => theme.motion.duration.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.bg.base};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &.active {
    background: ${({ theme }) => theme.colors.accent.soft};
    color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

export const SidebarIconSlot = styled.span`
  display: inline-flex;
  width: 24px;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
`;

export const SidebarFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(2)};
  padding-top: ${({ theme }) => theme.space(3)};
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  -webkit-app-region: no-drag;
`;

export const SidebarStatus = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
`;

export const HelpButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: ${({ theme }) => theme.radii.full};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    background ${({ theme }) => theme.motion.duration.fast},
    color ${({ theme }) => theme.motion.duration.fast};
  -webkit-app-region: no-drag;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.base};
    color: ${({ theme }) => theme.colors.accent.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focusRing};
    outline-offset: 2px;
  }
`;

export const StatusDot = styled.span<{ $ok: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ $ok, theme }) => ($ok ? theme.colors.success : theme.colors.error)};
  box-shadow: 0 0 8px ${({ $ok, theme }) => ($ok ? theme.colors.success : theme.colors.error)};
`;

export const Content = styled.main`
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
`;

export const ContentFrame = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

export const BackendStatusBanner = styled.div<{ $isOk: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => `${theme.space(2.5)} ${theme.space(5)}`};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.warning};
  background: rgba(245, 158, 11, 0.08);
  border-bottom: 1px solid rgba(245, 158, 11, 0.3);
`;
