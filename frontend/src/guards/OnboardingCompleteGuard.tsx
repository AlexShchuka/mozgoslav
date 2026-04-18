import { FC, PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";

import { ROUTES } from "../constants/routes";

/**
 * Blocks a route until the user has completed (or skipped to completion)
 * the onboarding wizard.
 *
 * TEMP (task #15, 2026-04-18): during active development the guard always
 * redirects to onboarding so changes to the wizard are visible on every
 * launch. To revert when onboarding stabilises: restore the previous
 * localStorage-based implementation from git history (also fixes Skip via
 * task #14).
 */
const OnboardingCompleteGuard: FC<PropsWithChildren> = () => {
  return <Navigate to={ROUTES.onboarding} replace />;
};

export default OnboardingCompleteGuard;
