import React, { FC, useEffect, useMemo, useState, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useHotkeys } from "react-hotkeys-hook";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, ListChecks, Brain, ListTree, Database, Settings, Wrench, Archive, FolderTree } from "lucide-react";

import { ROUTES } from "../../constants/routes";
import { Backdrop, Palette, Input, Item, ItemHint, ItemList, Section } from "./CommandPalette.style";

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  run: () => void;
  hint?: string;
}

const CommandPalette: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useHotkeys(
    "mod+k",
    (e) => {
      e.preventDefault();
      setOpen((v) => !v);
    },
    { enableOnFormTags: true },
  );

  useHotkeys("escape", () => setOpen(false), { enabled: open, enableOnFormTags: true });

  const commands = useMemo<Command[]>(
    () => [
      { id: "dashboard", label: t("nav.dashboard"), icon: <LayoutDashboard size={16} />, run: () => navigate(ROUTES.dashboard) },
      { id: "queue", label: t("nav.queue"), icon: <ListChecks size={16} />, run: () => navigate(ROUTES.queue) },
      { id: "notes", label: t("nav.notes"), icon: <Brain size={16} />, run: () => navigate(ROUTES.notes) },
      { id: "profiles", label: t("nav.profiles"), icon: <ListTree size={16} />, run: () => navigate(ROUTES.profiles) },
      { id: "models", label: t("nav.models"), icon: <Database size={16} />, run: () => navigate(ROUTES.models) },
      { id: "settings", label: t("nav.settings"), icon: <Settings size={16} />, run: () => navigate(ROUTES.settings), hint: "⌘," },
      { id: "logs", label: t("nav.logs"), icon: <Wrench size={16} />, run: () => navigate(ROUTES.logs) },
      { id: "backup", label: t("nav.backup"), icon: <Archive size={16} />, run: () => navigate(ROUTES.backup) },
      { id: "obsidian", label: t("obsidian.title"), icon: <FolderTree size={16} />, run: () => navigate("/obsidian") },
    ],
    [navigate, t],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const needle = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(needle));
  }, [commands, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const picked = filtered[activeIndex];
      if (picked) {
        picked.run();
        setOpen(false);
        setQuery("");
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <Backdrop onClick={() => setOpen(false)}>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Palette>
              <Input
                autoFocus
                placeholder={t("common.search")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
              />
              <Section>
                <ItemList>
                  {filtered.map((cmd, i) => (
                    <Item
                      key={cmd.id}
                      $active={i === activeIndex}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => {
                        cmd.run();
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      {cmd.icon}
                      <span>{cmd.label}</span>
                      {cmd.hint && <ItemHint>{cmd.hint}</ItemHint>}
                    </Item>
                  ))}
                </ItemList>
              </Section>
            </Palette>
          </motion.div>
        </Backdrop>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
