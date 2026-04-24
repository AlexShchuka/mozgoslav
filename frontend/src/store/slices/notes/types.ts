import type { ProcessedNote } from "../../../domain/ProcessedNote";

export interface NotesState {
  readonly byId: Record<string, ProcessedNote>;
  readonly isLoadingList: boolean;
  readonly isSubmitting: boolean;
  readonly deletingIds: Record<string, true>;
  readonly exportingIds: Record<string, true>;
  readonly lastListError: string | null;
}

export const initialNotesState: NotesState = {
  byId: {},
  isLoadingList: false,
  isSubmitting: false,
  deletingIds: {},
  exportingIds: {},
  lastListError: null,
};
