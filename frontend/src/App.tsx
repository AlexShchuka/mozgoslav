import { FC, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { KBarProvider } from "kbar";
import { useDispatch } from "react-redux";
import type { Action, Dispatch } from "redux";

import { Layout } from "./components/Layout";
import Home from "./features/Home";
import NotesList from "./features/Notes/NotesList";
import NoteViewer from "./features/Notes/NoteViewer";
import Ask from "./features/Ask";
import AskOverlay from "./features/AskOverlay";
import Profiles from "./features/Profiles";
import Models from "./features/Models";
import SettingsPage from "./features/Settings";
import Backups from "./features/Backups";
import Obsidian from "./features/Obsidian";
import Sync from "./features/Sync";
import Onboarding from "./features/Onboarding";
import DictationOverlay from "./features/DictationOverlay";
import CommandPalette, { useCommandPaletteActions } from "./features/CommandPalette";
import RoutinesContainer from "./features/Routines/Routines.container";
import PromptsContainer from "./features/Prompts/Prompts.container";
import { useGlobalHotkeys } from "./hooks/useGlobalHotkeys";
import { ROUTES } from "./constants/routes";
import { GLOBAL_HOTKEY_REDISPATCH_EVENT } from "./constants/events";
import { OnboardingCompleteGuard } from "./guards";
import { dictationCancelRequested } from "./store/slices/dictation";

const OVERLAY_ROUTE = "/dictation-overlay";
const ASK_OVERLAY_ROUTE = "/ask-overlay";

const AppShell: FC = () => {
  useGlobalHotkeys();
  useCommandPaletteActions();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<Dispatch<Action>>();

  useEffect(() => {
    const bridge = typeof window !== "undefined" ? window.mozgoslav : undefined;
    if (!bridge?.onOverlayCancelRequest) return;
    return bridge.onOverlayCancelRequest(() => {
      dispatch(dictationCancelRequested());
    });
  }, [dispatch]);

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
          <Route path={ROUTES.rag} element={<Navigate to={ROUTES.ask} replace />} />
          <Route
            path={ROUTES.ask}
            element={
              <OnboardingCompleteGuard>
                <Ask />
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
          <Route
            path={ROUTES.routines}
            element={
              <OnboardingCompleteGuard>
                <RoutinesContainer />
              </OnboardingCompleteGuard>
            }
          />
          <Route
            path={ROUTES.prompts}
            element={
              <OnboardingCompleteGuard>
                <PromptsContainer />
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
  const isAskOverlay = location.pathname === ASK_OVERLAY_ROUTE;

  if (isOverlay) {
    return (
      <Routes>
        <Route path={OVERLAY_ROUTE} element={<DictationOverlay />} />
      </Routes>
    );
  }

  if (isAskOverlay) {
    return (
      <Routes>
        <Route path={ASK_OVERLAY_ROUTE} element={<AskOverlay />} />
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
