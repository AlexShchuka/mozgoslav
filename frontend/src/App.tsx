import { FC } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { KBarProvider } from "kbar";

import { Layout } from "./components/Layout";
import Dashboard from "./features/Dashboard";
import Queue from "./features/Queue";
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

const OVERLAY_ROUTE = "/dictation-overlay";

// AppShell renders the main-app surface (sidebar + routes + command palette).
// It must live *inside* the KBarProvider so `useRegisterActions` inside
// `useCommandPaletteActions` has a provider to write into.
const AppShell: FC = () => {
  useGlobalHotkeys();
  useCommandPaletteActions();

  return (
    <>
      <Layout>
        <Routes>
          <Route path={ROUTES.onboarding} element={<Onboarding />} />
          <Route path={ROUTES.dashboard} element={<Dashboard />} />
          <Route path={ROUTES.queue} element={<Queue />} />
          <Route path={ROUTES.notes} element={<NotesList />} />
          <Route path={ROUTES.note} element={<NoteViewer />} />
          <Route path={ROUTES.rag} element={<RagChat />} />
          <Route path={ROUTES.profiles} element={<Profiles />} />
          <Route path={ROUTES.models} element={<Models />} />
          <Route path={ROUTES.settings} element={<SettingsPage />} />
          <Route path={ROUTES.logs} element={<Logs />} />
          <Route path={ROUTES.backup} element={<Backups />} />
          <Route path={ROUTES.obsidian} element={<Obsidian />} />
          <Route path={ROUTES.sync} element={<Sync />} />
          <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
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
    // The overlay window runs in its own BrowserWindow; it should NOT inherit
    // the main-app Layout (sidebar, header) or the command palette.
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
