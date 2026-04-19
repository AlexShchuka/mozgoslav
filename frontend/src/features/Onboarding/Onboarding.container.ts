import {connect} from "react-redux";
import {bindActionCreators, type Dispatch} from "redux";

import type {GlobalState} from "../../store";
import {
    completeOnboarding,
    nextStep,
    selectOnboardingCompleted,
    selectOnboardingStepIndex,
    setStep,
} from "../../store/slices/onboarding";
import Onboarding from "./Onboarding";
import type {OnboardingDispatchProps, OnboardingStateProps} from "./types";

const mapStateToProps = (state: GlobalState): OnboardingStateProps => ({
    completed: selectOnboardingCompleted(state),
    currentStepIndex: selectOnboardingStepIndex(state),
});

const mapDispatchToProps = (dispatch: Dispatch): OnboardingDispatchProps =>
    bindActionCreators(
        {
            onNextStep: nextStep,
            onSetStep: setStep,
            onComplete: completeOnboarding,
        },
        dispatch,
    );

export default connect(mapStateToProps, mapDispatchToProps)(Onboarding);
