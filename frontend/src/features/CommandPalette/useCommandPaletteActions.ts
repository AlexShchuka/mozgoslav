import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import type { Action as ReduxAction, Dispatch } from "redux";
import { Action, useRegisterActions } from "kbar";

import { createBackup } from "../../store/slices/backups";
import { loadSettings, selectSettings } from "../../store/slices/settings";
import { reindexRag } from "../../store/slices/rag";
import { notifyInfo } from "../../store/slices/notifications";
import { ROUTES } from "../../constants/routes";

export const useCommandPaletteActions = (): void => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch<Dispatch<ReduxAction>>();
  const settings = useSelector(selectSettings);

  useEffect(() => {
    if (!settings) {
      dispatch(loadSettings());
    }
  }, [dispatch, settings]);

  const actions = useMemo<Action[]>(() => {
    const navigation: Action[] = [
      {
        id: "nav-dashboard",
        name: t("nav.dashboard"),
        keywords: "home dashboard main",
        section: t("commandPalette.sections.navigation"),
        perform: () => navigate(ROUTES.dashboard),
      },
      {
        id: "nav-queue",
        name: t("nav.queue"),
        keywords: "queue jobs processing",
        section: t("commandPalette.sections.navigation"),
        perform: () => navigate(ROUTES.queue),
      },
      {
        id: "nav-notes",
        name: t("nav.notes"),
        keywords: "notes list",
        section: t("commandPalette.sections.navigation"),
        perform: () => navigate(ROUTES.notes),
      },
      {
        id: "nav-rag",
        name: t("nav.rag"),
        keywords: "rag chat question answer qa",
        section: t("commandPalette.sections.navigation"),
        perform: () => navigate(ROUTES.rag),
      },
      {
        id: "nav-profiles",
        name: t("nav.profiles"),
        keywords: "profiles templates cleanup",
        section: t("commandPalette.sections.navigation"),
        perform: () => navigate(ROUTES.profiles),
      },
      {
        id: "nav-obsidian",
        name: t("nav.obsidian"),
        keywords: "obsidian vault para export",
        section: t("commandPalette.sections.navigation"),
        perform: () => navigate(ROUTES.obsidian),
      },
      {
        id: "nav-sync",
        name: t("nav.sync"),
        keywords: "sync syncthing devices",
        section: t("commandPalette.sections.navigation"),
        perform: () => navigate(ROUTES.sync),
      },
      {
        id: "nav-models",
        name: t("nav.models"),
        keywords: "models whisper llm",
        section: t("commandPalette.sections.navigation"),
        perform: () => navigate(ROUTES.models),
      },
      {
        id: "nav-settings",
        name: t("nav.settings"),
        shortcut: ["$mod+,"],
        keywords: "settings preferences config",
        section: t("commandPalette.sections.navigation"),
        perform: () => navigate(ROUTES.settings),
      },
      {
        id: "nav-backup",
        name: t("nav.backup"),
        keywords: "backup archive restore",
        section: t("commandPalette.sections.navigation"),
        perform: () => navigate(ROUTES.backup),
      },
    ];

    const quick: Action[] = [
      {
        id: "quick-new-note",
        name: t("commandPalette.actions.newNote"),
        keywords: "new note write create add",
        section: t("commandPalette.sections.quick"),
        perform: () => {
          navigate(`${ROUTES.notes}?new=1`);
        },
      },
      {
        id: "quick-reindex-rag",
        name: t("commandPalette.actions.reindexRag"),
        keywords: "reindex rag embeddings vector refresh",
        section: t("commandPalette.sections.quick"),
        perform: () => {
          dispatch(reindexRag());
        },
      },
      {
        id: "quick-create-backup",
        name: t("commandPalette.actions.createBackup"),
        keywords: "backup create snapshot archive",
        section: t("commandPalette.sections.quick"),
        perform: () => {
          dispatch(createBackup());
        },
      },
      {
        id: "quick-open-obsidian",
        name: t("commandPalette.actions.openObsidianVault"),
        keywords: "obsidian vault finder reveal",
        section: t("commandPalette.sections.quick"),
        perform: () => {
          const bridge =
            typeof window !== "undefined"
              ? (window as Window & typeof globalThis).mozgoslav
              : undefined;
          if (!settings || !settings.vaultPath) {
            dispatch(loadSettings());
            dispatch(notifyInfo({ messageKey: "commandPalette.actions.vaultMissing" }));
            return;
          }
          if (!bridge) {
            dispatch(notifyInfo({ messageKey: "commandPalette.actions.bridgeMissing" }));
            return;
          }
          void bridge.openPath(settings.vaultPath);
        },
      },
    ];

    return [...navigation, ...quick];
  }, [navigate, t, dispatch, settings]);

  useRegisterActions(actions, [actions]);
};
