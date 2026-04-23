import { FC, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { KBarProvider } from "kbar";

import { Layout } from "./components/Layout";
import Home from "./features/Home";
import NotesList from "./features/Notes/NotesList";
import NoteViewer from "./features/Notes/NoteViewer";
import RagChat from "./features/RagChat";
import Profiles from "./features/Profiles";
import Models from "./features/Models";
import SettingsPage from "./features/Settings";
import Logs from "./features/Logs";
import Backups from "./features/Backups";
import Obsidian from "./features/Obsidian";
import Sync from "./features/Sync";
import Onboarding from "./features/Onboarding";
import DictationOverlay from "./features/DictationOverlay";
import CommandPalette, { useCommandPaletteActions } from "./features/CommandPalette";
import { useGlobalHotkeys } from "./hooks/useGlobalHotkeys";
import { ROUTES } from "./constants/routes";
import { GLOBAL_HOTKEY_REDISPATCH_EVENT } from "./constants/events";
import { OnboardingCompleteGuard } from "./guards";

const OVERLAY_ROUTE = "/dictation-overlay";

const AppShell: FC = () => {
  useGlobalHotkeys();
  useCommandPaletteActions();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const bridge = typeof window !== "undefined" ? window.mozgoslav : undefined;
    if (!bridge?.onGlobalHotkey) return;
    const unsubscribe = bridge.onGlobalHotkey((payload) => {
      console.info("[hotkey] AppShell received global-hotkey payload:", payload);
      const redispatch = () =>
        window.dispatchEvent(new CustomEvent(GLOBAL_HOTKEY_REDISPATCH_EVENT, { detail: payload }));
      if (location.pathname !== ROUTES.home) {
        navigate(ROUTES.home);
        setTimeout(redispatch, 50);
      } else {
        redispatch();
      }
    });
    return unsubscribe;
  }, [navigate, location.pathname]);

  return (
    <>
      <Layout>
        <Routes>
          <Route path={ROUTES.onboarding} element={<Onboarding />} />
          <Route
            path={ROUTES.home}
            element={
              <OnboardingCompleteGuard>
                <Home />
              </OnboardingCompleteGuard>
            }
          />
          {}
          <Route path={ROUTES.queue} element={<Navigate to={ROUTES.home} replace />} />
          <Route
            path={ROUTES.notes}
            element={
              <OnboardingCompleteGuard>
                <NotesList />
              </OnboardingCompleteGuard>
            }
          />
          <Route
            path={ROUTES.note}
            element={
              <OnboardingCompleteGuard>
                <NoteViewer />
              </OnboardingCompleteGuard>
            }
          />
          <Route
            path={ROUTES.rag}
            element={
              <OnboardingCompleteGuard>
                <RagChat />
              </OnboardingCompleteGuard>
            }
          />
          <Route
            path={ROUTES.profiles}
            element={
              <OnboardingCompleteGuard>
                <Profiles />
              </OnboardingCompleteGuard>
            }
          />
          <Route
            path={ROUTES.models}
            element={
              <OnboardingCompleteGuard>
                <Models />
              </OnboardingCompleteGuard>
            }
          />
          <Route
            path={ROUTES.settings}
            element={
              <OnboardingCompleteGuard>
                <SettingsPage />
              </OnboardingCompleteGuard>
            }
          />
          <Route
            path={ROUTES.logs}
            element={
              <OnboardingCompleteGuard>
                <Logs />
              </OnboardingCompleteGuard>
            }
          />
          <Route
            path={ROUTES.backup}
            element={
              <OnboardingCompleteGuard>
                <Backups />
              </OnboardingCompleteGuard>
            }
          />
          <Route
            path={ROUTES.obsidian}
            element={
              <OnboardingCompleteGuard>
                <Obsidian />
              </OnboardingCompleteGuard>
            }
          />
          <Route
            path={ROUTES.sync}
            element={
              <OnboardingCompleteGuard>
                <Sync />
              </OnboardingCompleteGuard>
            }
          />
          <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
        </Routes>
      </Layout>
      <CommandPalette />
    </>
  );
};

const App: FC = () => {
  const location = useLocation();
  const isOverlay = location.pathname === OVERLAY_ROUTE;

  if (isOverlay) {
    return (
      <Routes>
        <Route path={OVERLAY_ROUTE} element={<DictationOverlay />} />
      </Routes>
    );
  }

  return (
    <KBarProvider>
      <AppShell />
    </KBarProvider>
  );
};

export default App;
