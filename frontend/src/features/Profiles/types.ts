import type { Profile } from "../../domain/Profile";

export type ProfileMutation = Omit<Profile, "id" | "isBuiltIn">;

export interface ProfilesStateProps {
  readonly profiles: readonly Profile[];
  readonly isLoading: boolean;
  readonly saving: boolean;
  readonly deletingId: string | null;
  readonly error: string | null;
  readonly suggestions: Record<string, Record<string, string[]>>;
  readonly suggestingKey: string | null;
}

export interface ProfilesDispatchProps {
  readonly onLoad: () => void;
  readonly onCreate: (draft: ProfileMutation) => void;
  readonly onUpdate: (id: string, draft: ProfileMutation) => void;
  readonly onDelete: (id: string) => void;
  readonly onDuplicate: (id: string) => void;
  readonly onSuggest: (profileId: string, language: string) => void;
}

export type ProfilesProps = ProfilesStateProps & ProfilesDispatchProps;
