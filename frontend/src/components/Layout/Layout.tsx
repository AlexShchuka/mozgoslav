import { FC, ReactNode, useCallback } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { Action, Dispatch } from "redux";
import { useTranslation } from "react-i18next";
import {
  Archive,
  Brain,
  Database,
  FolderCog,
  FolderTree,
  HelpCircle,
  ListTree,
  MessageSquare,
  RefreshCw,
  Settings,
  Sparkles,
} from "lucide-react";

import { useBackendHealth } from "../../hooks/useBackendHealth";
import { ROUTES } from "../../constants/routes";
import {
  completeOnboarding,
  resetOnboarding,
  selectOnboardingCompleted,
} from "../../store/slices/onboarding";
import TitleBar from "../TitleBar";
import {
  BackendStatusBanner,
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

  const onRestartOnboarding = () => {
    dispatch(resetOnboarding());
    navigate(ROUTES.onboarding);
  };

  const onNavClick = useCallback(() => {
    if (!onboardingCompleted) {
      dispatch(completeOnboarding());
    }
  }, [dispatch, onboardingCompleted]);

  return (
    <LayoutRoot>
      <TitleBar />
      <Sidebar>
        <SidebarSection>
          <SidebarGroup>
            {}
            <NavItem to={ROUTES.home} icon={<Sparkles size={16} />} onClick={onNavClick}>
              {t("nav.home")}
            </NavItem>
            <NavItem to={ROUTES.notes} icon={<Brain size={16} />} onClick={onNavClick}>
              {t("nav.notes")}
            </NavItem>
            <NavItem to={ROUTES.rag} icon={<MessageSquare size={16} />} onClick={onNavClick}>
              {t("nav.rag")}
            </NavItem>
          </SidebarGroup>

          <SidebarGroup>
            <NavItem to={ROUTES.profiles} icon={<ListTree size={16} />} onClick={onNavClick}>
              {t("nav.profiles")}
            </NavItem>
            <NavItem to={ROUTES.models} icon={<Database size={16} />} onClick={onNavClick}>
              {t("nav.models")}
            </NavItem>
            <NavItem to={ROUTES.obsidian} icon={<FolderTree size={16} />} onClick={onNavClick}>
              {t("nav.obsidian")}
            </NavItem>
            <NavItem to={ROUTES.sync} icon={<RefreshCw size={16} />} onClick={onNavClick}>
              {t("nav.sync")}
            </NavItem>
          </SidebarGroup>

          <SidebarGroup>
            <NavItem to={ROUTES.settings} icon={<Settings size={16} />} onClick={onNavClick}>
              {t("nav.settings")}
            </NavItem>
            <NavItem to={ROUTES.backup} icon={<Archive size={16} />} onClick={onNavClick}>
              {t("nav.backup")}
            </NavItem>
          </SidebarGroup>
        </SidebarSection>

        <SidebarFooter>
          <SidebarStatus>
            <StatusDot $ok={isHealthy} />
            {isHealthy ? t("backendHealth.online") : t("backendHealth.offline")}
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
  onClick?: () => void;
}

const NavItem: FC<NavItemProps> = ({ to, icon, children, onClick }) => (
  <SidebarItem as={NavLink} to={to} end onClick={onClick}>
    <SidebarIconSlot>{icon}</SidebarIconSlot>
    <span>{children}</span>
  </SidebarItem>
);

export default Layout;
