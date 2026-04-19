import type {Profile} from "../../../domain/Profile";
import type {ProfilesState} from "./types";

type ByIdPatch = Pick<ProfilesState, "profiles" | "order">;

/**
 * Reducer helpers — keep list + map in sync. A new profile lands at the end
 * of `order`; re-saves replace the existing entry without changing position.
 */
export const toOrdered = (profiles: readonly Profile[]): ByIdPatch => {
    const byId: Record<string, Profile> = {};
    const order: string[] = [];
    for (const profile of profiles) {
        byId[profile.id] = profile;
        order.push(profile.id);
    }
    return {profiles: byId, order};
};

export const applyCreateOrReplace = (
    state: ProfilesState,
    profile: Profile,
): ByIdPatch => {
    const profiles = {...state.profiles, [profile.id]: profile};
    const order = state.order.includes(profile.id)
        ? state.order
        : [...state.order, profile.id];
    return {profiles, order};
};

export const applyDelete = (state: ProfilesState, id: string): ByIdPatch => {
    const remaining: Record<string, Profile> = {};
    for (const [profileId, profile] of Object.entries(state.profiles)) {
        if (profileId !== id) remaining[profileId] = profile;
    }
    return {
        profiles: remaining,
        order: state.order.filter((candidateId) => candidateId !== id),
    };
};
