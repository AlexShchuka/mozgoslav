import {FC, PropsWithChildren} from "react";
import {useSelector} from "react-redux";
import {Navigate} from "react-router-dom";

import {ROUTES} from "../constants/routes";
import {selectOnboardingCompleted} from "../store/slices/onboarding";

/**
 * Blocks a route until the user has completed (or skipped to completion)
 * the onboarding wizard. The source of truth is the Redux `onboarding.completed`
 * flag, which is hydrated from the backend via `watchOnboardingSagas`.
 */
const OnboardingCompleteGuard: FC<PropsWithChildren> = ({children}) => {
    const completed = useSelector(selectOnboardingCompleted);
    if (!completed) {
        return <Navigate to={ROUTES.onboarding} replace/>;
    }
    return <>{children}</>;
};

export default OnboardingCompleteGuard;
