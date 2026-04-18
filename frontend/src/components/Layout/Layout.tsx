import { FC, ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Archive, Brain, Database, FolderCog, FolderTree, LayoutDashboard, ListChecks, ListTree, MessageSquare, RefreshCw, Settings, Sparkles, Wrench } from "lucide-react";

import { useBackendHealth } from "../../hooks/useBackendHealth";
import { ROUTES } from "../../constants/routes";
import {
  AppName,
  BackendStatusBanner,
  Brand,
  Content,
  LayoutRoot,
  Sidebar,
  SidebarFooter,
  SidebarGroup,
  SidebarIconSlot,
  SidebarItem,
  SidebarSection,
  StatusDot,
} from "./Layout.style";

export interface LayoutProps {
  children: ReactNode;
}

const Layout: FC<LayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const health = useBackendHealth();
  const location = useLocation();
  const isHealthy = health.status === "ok";

  return (
    <LayoutRoot>
      <Sidebar>
        <Brand>
          <Sparkles size={20} />
          <AppName>{t("app.name")}</AppName>
        </Brand>

        <SidebarSection>
          <SidebarGroup>
            <NavItem to={ROUTES.dashboard} icon={<LayoutDashboard size={16} />}>
              {t("nav.dashboard")}
            </NavItem>
            <NavItem to={ROUTES.queue} icon={<ListChecks size={16} />}>
              {t("nav.queue")}
            </NavItem>
            <NavItem to={ROUTES.notes} icon={<Brain size={16} />}>
              {t("nav.notes")}
            </NavItem>
            <NavItem to={ROUTES.rag} icon={<MessageSquare size={16} />}>
              {t("nav.rag")}
            </NavItem>
          </SidebarGroup>

          <SidebarGroup>
            <NavItem to={ROUTES.profiles} icon={<ListTree size={16} />}>
              {t("nav.profiles")}
            </NavItem>
            <NavItem to={ROUTES.models} icon={<Database size={16} />}>
              {t("nav.models")}
            </NavItem>
            <NavItem to={ROUTES.obsidian} icon={<FolderTree size={16} />}>
              {t("nav.obsidian")}
            </NavItem>
            <NavItem to={ROUTES.sync} icon={<RefreshCw size={16} />}>
              {t("nav.sync")}
            </NavItem>
          </SidebarGroup>

          <SidebarGroup>
            <NavItem to={ROUTES.settings} icon={<Settings size={16} />}>
              {t("nav.settings")}
            </NavItem>
            <NavItem to={ROUTES.logs} icon={<Wrench size={16} />}>
              {t("nav.logs")}
            </NavItem>
            <NavItem to={ROUTES.backup} icon={<Archive size={16} />}>
              {t("nav.backup")}
            </NavItem>
          </SidebarGroup>
        </SidebarSection>

        <SidebarFooter>
          <StatusDot $ok={isHealthy} />
          {isHealthy ? t("backendHealth.online") : t("backendHealth.offline")}
        </SidebarFooter>
      </Sidebar>
      <Content>
        {!isHealthy && (
          <BackendStatusBanner $isOk={isHealthy} data-testid="backend-banner">
            <FolderCog size={16} />
            <span>{t("backendHealth.offline")} — {t("backendHealth.hint")}</span>
          </BackendStatusBanner>
        )}
        <div data-current-path={location.pathname}>{children}</div>
      </Content>
    </LayoutRoot>
  );
};

interface NavItemProps {
  to: string;
  icon: ReactNode;
  children: ReactNode;
}

const NavItem: FC<NavItemProps> = ({ to, icon, children }) => (
  <SidebarItem as={NavLink} to={to} end>
    <SidebarIconSlot>{icon}</SidebarIconSlot>
    <span>{children}</span>
  </SidebarItem>
);

export default Layout;
