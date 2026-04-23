import type { Reducer } from "redux";

import {
  CREATE_PROFILE,
  CREATE_PROFILE_FAILURE,
  CREATE_PROFILE_SUCCESS,
  DELETE_PROFILE,
  DELETE_PROFILE_FAILURE,
  DELETE_PROFILE_SUCCESS,
  DUPLICATE_PROFILE,
  DUPLICATE_PROFILE_FAILURE,
  DUPLICATE_PROFILE_SUCCESS,
  LOAD_PROFILES,
  LOAD_PROFILES_FAILURE,
  LOAD_PROFILES_SUCCESS,
  type ProfilesAction,
  UPDATE_PROFILE,
  UPDATE_PROFILE_FAILURE,
  UPDATE_PROFILE_SUCCESS,
} from "./actions";
import { applyCreateOrReplace, applyDelete, toOrdered } from "./mutations";
import { initialProfilesState, type ProfilesState } from "./types";

export const profilesReducer: Reducer<ProfilesState> = (
  state: ProfilesState = initialProfilesState,
  action
): ProfilesState => {
  const typed = action as ProfilesAction;
  switch (typed.type) {
    case LOAD_PROFILES:
      return { ...state, isLoading: true, error: null };
    case LOAD_PROFILES_SUCCESS:
      return { ...state, isLoading: false, error: null, ...toOrdered(typed.payload) };
    case LOAD_PROFILES_FAILURE:
      return { ...state, isLoading: false, error: typed.payload };

    case CREATE_PROFILE:
    case UPDATE_PROFILE:
      return { ...state, saving: true, error: null };
    case CREATE_PROFILE_SUCCESS:
    case UPDATE_PROFILE_SUCCESS:
    case DUPLICATE_PROFILE_SUCCESS:
      return {
        ...state,
        saving: false,
        deletingId: null,
        ...applyCreateOrReplace(state, typed.payload),
      };
    case CREATE_PROFILE_FAILURE:
    case UPDATE_PROFILE_FAILURE:
      return { ...state, saving: false, error: typed.payload };

    case DELETE_PROFILE:
      return { ...state, deletingId: typed.payload.id, error: null };
    case DELETE_PROFILE_SUCCESS:
      return { ...state, deletingId: null, ...applyDelete(state, typed.payload.id) };
    case DELETE_PROFILE_FAILURE:
      return { ...state, deletingId: null, error: typed.payload.error };

    case DUPLICATE_PROFILE:
      return { ...state, saving: true, error: null };
    case DUPLICATE_PROFILE_FAILURE:
      return { ...state, saving: false, error: typed.payload.error };

    default:
      return state;
  }
};
