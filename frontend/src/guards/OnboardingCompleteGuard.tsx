import { FC, PropsWithChildren, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { ROUTES } from "../constants/routes";
import { ONBOARDING_COMPLETE_STORAGE_KEY } from "../store/slices/onboarding";

/**
 * Blocks a route until the user has completed (or skipped to completion)
 * the onboarding wizard.
 *
 * Source of truth is `localStorage.mozgoslav.onboardingComplete`. Reading
 * happens once on mount so a later setItem inside the same tree does not
 * retroactively redirect an already-rendered subtree — by that point the
 * navigation has already happened via `navigate(ROUTES.dashboard)` inside
 * the Onboarding component's finish handler.
 */
const OnboardingCompleteGuard: FC<PropsWithChildren> = ({ children }) => {
  const [status, setStatus] = useState<"checking" | "allowed" | "redirect">(
    "checking",
  );

  useEffect(() => {
    try {
      const flag = window.localStorage.getItem(ONBOARDING_COMPLETE_STORAGE_KEY);
      setStatus(flag === "true" ? "allowed" : "redirect");
    } catch {
      // localStorage may be locked (e.g. tests / private mode). Treat as a
      // fresh install and send the user through onboarding.
      setStatus("redirect");
    }
  }, []);

  if (status === "checking") return null;
  if (status === "redirect") return <Navigate to={ROUTES.onboarding} replace />;
  return <>{children}</>;
};

export default OnboardingCompleteGuard;
