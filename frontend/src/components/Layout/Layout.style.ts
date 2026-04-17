import styled from "styled-components";

import { liquidGlass } from "../../styles/liquidGlass";

export const LayoutRoot = styled.div`
  display: grid;
  grid-template-columns: 240px 1fr;
  height: 100vh;
  background: ${({ theme }) => theme.colors.bg};
`;

export const Sidebar = styled.aside`
  ${liquidGlass}
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.space(4)};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  -webkit-app-region: drag;
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(2.5)};
  color: ${({ theme }) => theme.colors.accent};
`;

export const AppName = styled.h1`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text};
  letter-spacing: -0.01em;
`;

export const SidebarTitle = styled.h1`
  margin: 0 0 ${({ theme }) => theme.space(3)} 0;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text};
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
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  text-decoration: none;
  transition: background ${({ theme }) => theme.motion.fast}, color ${({ theme }) => theme.motion.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.bg};
    color: ${({ theme }) => theme.colors.text};
  }

  &.active {
    background: ${({ theme }) => theme.colors.accentSoft};
    color: ${({ theme }) => theme.colors.accent};
  }
`;

export const SidebarFooter = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding-top: ${({ theme }) => theme.space(3)};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  -webkit-app-region: no-drag;
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
