import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "mozgoslav.sidebar.collapsed";

const readInitial = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

export const useSidebarCollapsed = (): readonly [boolean, () => void] => {
  const [collapsed, setCollapsed] = useState<boolean>(readInitial);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* storage unavailable — preference not persisted this session */
    }
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsed((prev) => !prev), []);

  return [collapsed, toggle] as const;
};
