import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Action, useRegisterActions } from "kbar";
import { toast } from "react-toastify";

import { graphqlClient } from "../../api/graphqlClient";
import {
  MutationCreateBackupDocument,
  MutationRagReindexDocument,
  QuerySettingsDocument,
} from "../../api/gql/graphql";
import { ROUTES } from "../../constants/routes";

export const useCommandPaletteActions = (): void => {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
          void graphqlClient
            .request(MutationRagReindexDocument)
            .then((data) =>
              toast.success(
                t("rag.reindexedToast", { count: data.ragReindex.embeddedNotes })
              )
            )
            .catch((err) => toast.error(err instanceof Error ? err.message : String(err)));
        },
      },
      {
        id: "quick-create-backup",
        name: t("commandPalette.actions.createBackup"),
        keywords: "backup create snapshot archive",
        section: t("commandPalette.sections.quick"),
        perform: () => {
          void graphqlClient
            .request(MutationCreateBackupDocument)
            .then(() => toast.success(t("commandPalette.actions.backupStarted")))
            .catch((err) => toast.error(err instanceof Error ? err.message : String(err)));
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
          void (async () => {
            try {
              const data = await graphqlClient.request(QuerySettingsDocument);
              if (!data.settings.vaultPath) {
                toast.info(t("commandPalette.actions.vaultMissing"));
                return;
              }
              if (!bridge) {
                toast.info(t("commandPalette.actions.bridgeMissing"));
                return;
              }
              await bridge.openPath(data.settings.vaultPath);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : String(err));
            }
          })();
        },
      },
    ];

    return [...navigation, ...quick];
  }, [navigate, t]);

  useRegisterActions(actions, [actions]);
};
