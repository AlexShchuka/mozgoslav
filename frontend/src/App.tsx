import { FC } from "react";
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
import Onboarding, { ONBOARDING_COMPLETED_STORAGE_KEY } from "./features/Onboarding";
import DictationOverlay from "./features/DictationOverlay";
import CommandPalette from "./features/CommandPalette";
import { useGlobalHotkeys } from "./hooks/useGlobalHotkeys";
import { ROUTES } from "./constants/routes";

const hasCompletedOnboarding = (): boolean => {
  try {
    return window.localStorage.getItem(ONBOARDING_COMPLETED_STORAGE_KEY) === "1";
  } catch {
    return true; // if storage is broken, don't get stuck on the wizard
  }
};

const OVERLAY_ROUTE = "/dictation-overlay";

const App: FC = () => {
  useGlobalHotkeys();
  const location = useLocation();
  const isOverlay = location.pathname === OVERLAY_ROUTE;

  if (isOverlay) {
    // The overlay window runs in its own BrowserWindow; it should NOT inherit
    // the main-app Layout (sidebar, header) or the command palette.
    return (
      <Routes>
        <Route path={OVERLAY_ROUTE} element={<DictationOverlay />} />
      </Routes>
    );
  }

  // First-run gate: if the user has never finished (or skipped) the wizard and
  // they land on the dashboard, redirect to /onboarding. Completion is tracked
  // in localStorage so subsequent launches go straight to the dashboard.
  if (
    location.pathname === ROUTES.dashboard &&
    !hasCompletedOnboarding()
  ) {
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
