import { FC, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Action,
  ActionId,
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarProvider,
  KBarResults,
  KBarSearch,
  useMatches,
} from "kbar";
import {
  Archive,
  Brain,
  Database,
  FolderTree,
  LayoutDashboard,
  ListChecks,
  ListTree,
  Settings,
  Wrench,
} from "lucide-react";

import { ROUTES } from "../../constants/routes";
import {
  AnimatorShell,
  ResultGroupTitle,
  ResultItemRoot,
  ResultShortcut,
  SearchInput,
} from "./CommandPalette.style";

const iconFor = (id: string): React.ReactNode => {
  switch (id) {
    case "dashboard":
      return <LayoutDashboard size={16} />;
    case "queue":
      return <ListChecks size={16} />;
    case "notes":
      return <Brain size={16} />;
    case "profiles":
      return <ListTree size={16} />;
    case "models":
      return <Database size={16} />;
    case "settings":
      return <Settings size={16} />;
    case "logs":
      return <Wrench size={16} />;
    case "backup":
      return <Archive size={16} />;
    case "obsidian":
      return <FolderTree size={16} />;
    default:
      return null;
  }
};

const RenderedResults: FC = () => {
  const { results } = useMatches();
  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) =>
        typeof item === "string" ? (
          <ResultGroupTitle>{item}</ResultGroupTitle>
        ) : (
          <ResultItemRoot $active={active}>
            {iconFor(item.id as string)}
            <span>{item.name}</span>
            {item.shortcut?.length ? (
              <ResultShortcut>{item.shortcut.join(" ")}</ResultShortcut>
            ) : null}
          </ResultItemRoot>
        )
      }
    />
  );
};

const CommandPaletteInner: FC = () => {
  const { t } = useTranslation();
  return (
    <KBarPortal>
      <KBarPositioner>
        <KBarAnimator>
          <AnimatorShell>
            <SearchInput placeholder={t("common.search")} />
            <RenderedResults />
          </AnimatorShell>
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  );
};

const CommandPalette: FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const actions = useMemo<Action[]>(
    () =>
      [
        { id: "dashboard" as ActionId, name: t("nav.dashboard"), keywords: "home main", perform: () => navigate(ROUTES.dashboard) },
        { id: "queue" as ActionId, name: t("nav.queue"), keywords: "jobs progress", perform: () => navigate(ROUTES.queue) },
        { id: "notes" as ActionId, name: t("nav.notes"), keywords: "transcripts summaries", perform: () => navigate(ROUTES.notes) },
        { id: "profiles" as ActionId, name: t("nav.profiles"), keywords: "personas", perform: () => navigate(ROUTES.profiles) },
        { id: "models" as ActionId, name: t("nav.models"), keywords: "whisper llm", perform: () => navigate(ROUTES.models) },
        { id: "settings" as ActionId, name: t("nav.settings"), shortcut: ["$mod+,"], keywords: "preferences", perform: () => navigate(ROUTES.settings) },
        { id: "logs" as ActionId, name: t("nav.logs"), keywords: "diagnostics", perform: () => navigate(ROUTES.logs) },
        { id: "backup" as ActionId, name: t("nav.backup"), keywords: "restore", perform: () => navigate(ROUTES.backup) },
        { id: "obsidian" as ActionId, name: t("obsidian.title"), keywords: "vault", perform: () => navigate("/obsidian") },
      ],
    [navigate, t],
  );

  return (
    <KBarProvider actions={actions} options={{ enableHistory: true }}>
      <CommandPaletteInner />
    </KBarProvider>
  );
};

export default CommandPalette;
