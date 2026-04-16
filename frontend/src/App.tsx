import { FC } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

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
import CommandPalette from "./features/CommandPalette";
import { useGlobalHotkeys } from "./hooks/useGlobalHotkeys";
import { ROUTES } from "./constants/routes";

const App: FC = () => {
  useGlobalHotkeys();

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
