import { FC, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { Layout } from "./components/Layout";
import Dashboard from "./features/Dashboard";
import Queue from "./features/Queue";
import NotesList from "./features/Notes/NotesList";
import NoteViewer from "./features/Notes/NoteViewer";
import Profiles from "./features/Profiles";
import Models from "./features/Models";
import SettingsPage from "./features/Settings";
import Logs from "./features/Logs";
import Backups from "./features/Backups";
import Obsidian from "./features/Obsidian";
import Onboarding from "./features/Onboarding";
import DictationOverlay from "./features/DictationOverlay";
import CommandPalette from "./features/CommandPalette";
import { useGlobalHotkeys } from "./hooks/useGlobalHotkeys";
import { ROUTES } from "./constants/routes";
import { api } from "./api/MozgoslavApi";

const OVERLAY_ROUTE = "/dictation-overlay";

/** Tri-state — `null` means "still checking settings". */
type OnboardingState = "done" | "pending" | null;

const App: FC = () => {
  useGlobalHotkeys();
  const location = useLocation();
  const [onboarding, setOnboarding] = useState<OnboardingState>(null);

  // Settings-backed onboarding gate (ADR-006 D-15.d). Checked once on mount;
  // the wizard writes onboardingComplete=true on Skip or Apply, and Settings
  // exposes a "Run onboarding again" button that navigates to /onboarding
  // without touching the flag — re-entry is route-driven, not state-driven.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const settings = await api.getSettings();
        if (!cancelled) setOnboarding(settings.onboardingComplete ? "done" : "pending");
      } catch {
        if (!cancelled) setOnboarding("done");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (location.pathname === OVERLAY_ROUTE) {
    return (
      <Routes>
        <Route path={OVERLAY_ROUTE} element={<DictationOverlay />} />
      </Routes>
    );
  }

  if (onboarding === "pending" && location.pathname === ROUTES.dashboard) {
    return <Navigate to={ROUTES.onboarding} replace />;
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route path={ROUTES.onboarding} element={<Onboarding />} />
          <Route path={ROUTES.dashboard} element={<Dashboard />} />
          <Route path={ROUTES.queue} element={<Queue />} />
          <Route path={ROUTES.notes} element={<NotesList />} />
          <Route path={ROUTES.note} element={<NoteViewer />} />
          <Route path={ROUTES.profiles} element={<Profiles />} />
          <Route path={ROUTES.models} element={<Models />} />
          <Route path={ROUTES.settings} element={<SettingsPage />} />
          <Route path={ROUTES.logs} element={<Logs />} />
          <Route path={ROUTES.backup} element={<Backups />} />
          <Route path="/obsidian" element={<Obsidian />} />
          <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
        </Routes>
      </Layout>
      <CommandPalette />
    </>
  );
};

export default App;
