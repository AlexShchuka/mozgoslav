import type {Profile} from "../../../domain/Profile";
import type {ProfileDraft} from "./types";

export const LOAD_PROFILES = "profiles/LOAD";
export const LOAD_PROFILES_SUCCESS = "profiles/LOAD_SUCCESS";
export const LOAD_PROFILES_FAILURE = "profiles/LOAD_FAILURE";

export const CREATE_PROFILE = "profiles/CREATE";
export const CREATE_PROFILE_SUCCESS = "profiles/CREATE_SUCCESS";
export const CREATE_PROFILE_FAILURE = "profiles/CREATE_FAILURE";

export const UPDATE_PROFILE = "profiles/UPDATE";
export const UPDATE_PROFILE_SUCCESS = "profiles/UPDATE_SUCCESS";
export const UPDATE_PROFILE_FAILURE = "profiles/UPDATE_FAILURE";

export const DELETE_PROFILE = "profiles/DELETE";
export const DELETE_PROFILE_SUCCESS = "profiles/DELETE_SUCCESS";
export const DELETE_PROFILE_FAILURE = "profiles/DELETE_FAILURE";

export const DUPLICATE_PROFILE = "profiles/DUPLICATE";
export const DUPLICATE_PROFILE_SUCCESS = "profiles/DUPLICATE_SUCCESS";
export const DUPLICATE_PROFILE_FAILURE = "profiles/DUPLICATE_FAILURE";

export interface LoadProfilesAction {
    type: typeof LOAD_PROFILES;
}

export interface LoadProfilesSuccessAction {
    type: typeof LOAD_PROFILES_SUCCESS;
    payload: Profile[];
}

export interface LoadProfilesFailureAction {
    type: typeof LOAD_PROFILES_FAILURE;
    payload: string;
}

export interface CreateProfileAction {
    type: typeof CREATE_PROFILE;
    payload: Omit<Profile, "id" | "isBuiltIn">;
}

export interface CreateProfileSuccessAction {
    type: typeof CREATE_PROFILE_SUCCESS;
    payload: Profile;
}

export interface CreateProfileFailureAction {
    type: typeof CREATE_PROFILE_FAILURE;
    payload: string;
}

export interface UpdateProfileAction {
    type: typeof UPDATE_PROFILE;
    payload: { id: string; draft: Omit<Profile, "id" | "isBuiltIn"> };
}

export interface UpdateProfileSuccessAction {
    type: typeof UPDATE_PROFILE_SUCCESS;
    payload: Profile;
}

export interface UpdateProfileFailureAction {
    type: typeof UPDATE_PROFILE_FAILURE;
    payload: string;
}

export interface DeleteProfileAction {
    type: typeof DELETE_PROFILE;
    payload: { id: string };
}

export interface DeleteProfileSuccessAction {
    type: typeof DELETE_PROFILE_SUCCESS;
    payload: { id: string };
}

export interface DeleteProfileFailureAction {
    type: typeof DELETE_PROFILE_FAILURE;
    payload: { id: string; error: string };
}

export interface DuplicateProfileAction {
    type: typeof DUPLICATE_PROFILE;
    payload: { id: string };
}

export interface DuplicateProfileSuccessAction {
    type: typeof DUPLICATE_PROFILE_SUCCESS;
    payload: Profile;
}

export interface DuplicateProfileFailureAction {
    type: typeof DUPLICATE_PROFILE_FAILURE;
    payload: { id: string; error: string };
}

export type ProfilesAction =
    | LoadProfilesAction
    | LoadProfilesSuccessAction
    | LoadProfilesFailureAction
    | CreateProfileAction
    | CreateProfileSuccessAction
    | CreateProfileFailureAction
    | UpdateProfileAction
    | UpdateProfileSuccessAction
    | UpdateProfileFailureAction
    | DeleteProfileAction
    | DeleteProfileSuccessAction
    | DeleteProfileFailureAction
    | DuplicateProfileAction
    | DuplicateProfileSuccessAction
    | DuplicateProfileFailureAction;

export const loadProfiles = (): LoadProfilesAction => ({type: LOAD_PROFILES});
export const loadProfilesSuccess = (profiles: Profile[]): LoadProfilesSuccessAction => ({
    type: LOAD_PROFILES_SUCCESS,
    payload: profiles,
});
export const loadProfilesFailure = (message: string): LoadProfilesFailureAction => ({
    type: LOAD_PROFILES_FAILURE,
    payload: message,
});

export const createProfile = (
    draft: Omit<Profile, "id" | "isBuiltIn">,
): CreateProfileAction => ({type: CREATE_PROFILE, payload: draft});
export const createProfileSuccess = (profile: Profile): CreateProfileSuccessAction => ({
    type: CREATE_PROFILE_SUCCESS,
    payload: profile,
});
export const createProfileFailure = (message: string): CreateProfileFailureAction => ({
    type: CREATE_PROFILE_FAILURE,
    payload: message,
});

export const updateProfile = (
    id: string,
    draft: Omit<Profile, "id" | "isBuiltIn">,
): UpdateProfileAction => ({type: UPDATE_PROFILE, payload: {id, draft}});
export const updateProfileSuccess = (profile: Profile): UpdateProfileSuccessAction => ({
    type: UPDATE_PROFILE_SUCCESS,
    payload: profile,
});
export const updateProfileFailure = (message: string): UpdateProfileFailureAction => ({
    type: UPDATE_PROFILE_FAILURE,
    payload: message,
});

export const deleteProfile = (id: string): DeleteProfileAction => ({
    type: DELETE_PROFILE,
    payload: {id},
});
export const deleteProfileSuccess = (id: string): DeleteProfileSuccessAction => ({
    type: DELETE_PROFILE_SUCCESS,
    payload: {id},
});
export const deleteProfileFailure = (id: string, error: string): DeleteProfileFailureAction => ({
    type: DELETE_PROFILE_FAILURE,
    payload: {id, error},
});

export const duplicateProfile = (id: string): DuplicateProfileAction => ({
    type: DUPLICATE_PROFILE,
    payload: {id},
});
export const duplicateProfileSuccess = (
    profile: Profile,
): DuplicateProfileSuccessAction => ({
    type: DUPLICATE_PROFILE_SUCCESS,
    payload: profile,
});
export const duplicateProfileFailure = (
    id: string,
    error: string,
): DuplicateProfileFailureAction => ({
    type: DUPLICATE_PROFILE_FAILURE,
    payload: {id, error},
});

export type {ProfileDraft};
