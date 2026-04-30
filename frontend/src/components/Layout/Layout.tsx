import { FC, ReactNode, useCallback } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { Action, Dispatch } from "redux";
import { useTranslation } from "react-i18next";
import {
  Activity,
  Archive,
  Brain,
  Database,
  FolderCog,
  FolderTree,
  HelpCircle,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  RotateCw,
  Settings,
  Sparkles,
  TextQuote,
} from "lucide-react";

import { useBackendHealth } from "../../hooks/useBackendHealth";
import { useSidebarCollapsed } from "../../hooks/useSidebarCollapsed";
import { ROUTES } from "../../constants/routes";
import {
  completeOnboarding,
  resetOnboarding,
  selectOnboardingCompleted,
} from "../../store/slices/onboarding";
import TitleBar from "../TitleBar";
import {
  BackendStatusBanner,
  CollapseButton,
  Content,
  HelpButton,
  LayoutRoot,
  Sidebar,
  SidebarFooter,
  SidebarGroup,
  SidebarIconSlot,
  SidebarItem,
  SidebarSection,
  SidebarStatus,
  StatusDot,
} from "./Layout.style";

export interface LayoutProps {
  children: ReactNode;
}

const Layout: FC<LayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const health = useBackendHealth();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch<Dispatch<Action>>();
  const onboardingCompleted = useSelector(selectOnboardingCompleted);
  const isHealthy = health.status === "ok";
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();

  const onRestartOnboarding = () => {
    dispatch(resetOnboarding());
    navigate(ROUTES.onboarding);
  };

  const onNavClick = useCallback(() => {
    if (!onboardingCompleted) {
      dispatch(completeOnboarding());
    }
  }, [dispatch, onboardingCompleted]);

  const collapseLabel = collapsed ? t("sidebar.expand") : t("sidebar.collapse");

  return (
    <LayoutRoot $collapsed={collapsed}>
      <TitleBar />
      <Sidebar $collapsed={collapsed}>
        <SidebarSection>
          <SidebarGroup>
            <NavItem
              to={ROUTES.home}
              icon={<Sparkles size={16} />}
              collapsed={collapsed}
              onClick={onNavClick}
            >
              {t("nav.home")}
            </NavItem>
            <NavItem
              to={ROUTES.notes}
              icon={<Brain size={16} />}
              collapsed={collapsed}
              onClick={onNavClick}
            >
              {t("nav.notes")}
            </NavItem>
            <NavItem
              to={ROUTES.rag}
              icon={<MessageSquare size={16} />}
              collapsed={collapsed}
              onClick={onNavClick}
            >
              {t("nav.rag")}
            </NavItem>
          </SidebarGroup>

          <SidebarGroup>
            <NavItem
              to={ROUTES.models}
              icon={<Database size={16} />}
              collapsed={collapsed}
              onClick={onNavClick}
            >
              {t("nav.models")}
            </NavItem>
            <NavItem
              to={ROUTES.obsidian}
              icon={<FolderTree size={16} />}
              collapsed={collapsed}
              onClick={onNavClick}
            >
              {t("nav.obsidian")}
            </NavItem>
            <NavItem
              to={ROUTES.sync}
              icon={<RefreshCw size={16} />}
              collapsed={collapsed}
              onClick={onNavClick}
            >
              {t("nav.sync")}
            </NavItem>
            <NavItem
              to={ROUTES.routines}
              icon={<RotateCw size={16} />}
              collapsed={collapsed}
              onClick={onNavClick}
            >
              {t("nav.routines")}
            </NavItem>
            <NavItem
              to={ROUTES.prompts}
              icon={<TextQuote size={16} />}
              collapsed={collapsed}
              onClick={onNavClick}
            >
              {t("nav.prompts")}
            </NavItem>
          </SidebarGroup>

          <SidebarGroup>
            <NavItem
              to={ROUTES.monitoring}
              icon={<Activity size={16} />}
              collapsed={collapsed}
              onClick={onNavClick}
            >
              {t("nav.monitoring")}
            </NavItem>
            <NavItem
              to={ROUTES.settings}
              icon={<Settings size={16} />}
              collapsed={collapsed}
              onClick={onNavClick}
            >
              {t("nav.settings")}
            </NavItem>
            <NavItem
              to={ROUTES.backup}
              icon={<Archive size={16} />}
              collapsed={collapsed}
              onClick={onNavClick}
            >
              {t("nav.backup")}
            </NavItem>
          </SidebarGroup>
        </SidebarSection>

        <SidebarFooter $collapsed={collapsed}>
          <SidebarStatus $collapsed={collapsed} title={t("backendHealth.online")}>
            <StatusDot $ok={isHealthy} />
            <span data-status-label>
              {isHealthy ? t("backendHealth.online") : t("backendHealth.offline")}
            </span>
          </SidebarStatus>
          <HelpButton
            type="button"
            aria-label={t("sidebar.restartOnboarding")}
            title={t("sidebar.restartOnboarding")}
            onClick={onRestartOnboarding}
            data-testid="sidebar-restart-onboarding"
          >
            <HelpCircle size={18} />
          </HelpButton>
          <CollapseButton
            type="button"
            aria-label={collapseLabel}
            title={collapseLabel}
            onClick={toggleCollapsed}
            data-testid="sidebar-collapse-toggle"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </CollapseButton>
        </SidebarFooter>
      </Sidebar>
      <Content>
        {!isHealthy && (
          <BackendStatusBanner $isOk={isHealthy} data-testid="backend-banner">
            <FolderCog size={16} />
            <span>
              {t("backendHealth.offline")} — {t("backendHealth.hint")}
            </span>
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
  collapsed: boolean;
  onClick?: () => void;
}

const NavItem: FC<NavItemProps> = ({ to, icon, children, collapsed, onClick }) => (
  <SidebarItem
    as={NavLink}
    to={to}
    end
    $collapsed={collapsed}
    title={collapsed && typeof children === "string" ? children : undefined}
    onClick={onClick}
  >
    <SidebarIconSlot>{icon}</SidebarIconSlot>
    <span data-nav-label>{children}</span>
  </SidebarItem>
);

export default Layout;
