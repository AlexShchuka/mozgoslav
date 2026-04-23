import {FC, PropsWithChildren} from "react";
import {useSelector} from "react-redux";
import {Navigate} from "react-router-dom";

import {ROUTES} from "../constants/routes";
import {selectOnboardingCompleted} from "../store/slices/onboarding";

const OnboardingCompleteGuard: FC<PropsWithChildren> = ({children}) => {
    const completed = useSelector(selectOnboardingCompleted);
    if (!completed) {
        return <Navigate to={ROUTES.onboarding} replace/>;
    }
    return <>{children}</>;
};

export default OnboardingCompleteGuard;
