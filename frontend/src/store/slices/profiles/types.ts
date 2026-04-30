import type { Profile } from "../../../domain/Profile";

export interface ProfilesState {
  readonly profiles: Record<string, Profile>;
  readonly order: readonly string[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly saving: boolean;
  readonly deletingId: string | null;
  readonly suggestions: Record<string, Record<string, string[]>>;
  readonly suggestingKey: string | null;
}

export const initialProfilesState: ProfilesState = {
  profiles: {},
  order: [],
  isLoading: false,
  error: null,
  saving: false,
  deletingId: null,
  suggestions: {},
  suggestingKey: null,
};

export type ProfileDraft = Omit<Profile, "isBuiltIn">;
