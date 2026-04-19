import type {Reducer} from "redux";

import {
    COMPLETE_ONBOARDING,
    COMPLETION_LOADED,
    COMPLETION_PERSIST_FAILED,
    NEXT_STEP,
    type OnboardingAction,
    RESET_ONBOARDING,
    SET_STEP,
} from "./actions";
import {advance, goToStep} from "./mutations";
import {initialOnboardingState, type OnboardingState} from "./types";

export const onboardingReducer: Reducer<OnboardingState> = (
    state: OnboardingState = initialOnboardingState,
    action,
): OnboardingState => {
    const typed = action as OnboardingAction;
    switch (typed.type) {
        case SET_STEP:
            return goToStep(state, typed.payload.index);
        case NEXT_STEP:
            return advance(state, typed.payload.max);
        case COMPLETE_ONBOARDING:
            return {...state, completed: true, error: null};
        case RESET_ONBOARDING:
            return initialOnboardingState;
        case COMPLETION_LOADED:
            return {...state, completed: typed.payload.completed};
        case COMPLETION_PERSIST_FAILED:
            return {...state, error: typed.payload};
        default:
            return state;
    }
};
