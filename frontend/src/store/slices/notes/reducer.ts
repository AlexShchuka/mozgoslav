import type { Reducer } from "redux";
import {
  CREATE_NOTE,
  CREATE_NOTE_FAILURE,
  CREATE_NOTE_SUCCESS,
  DELETE_NOTE,
  DELETE_NOTE_FAILURE,
  DELETE_NOTE_SUCCESS,
  EXPORT_NOTE,
  EXPORT_NOTE_FAILURE,
  EXPORT_NOTE_SUCCESS,
  LOAD_NOTE_SUCCESS,
  LOAD_NOTES,
  LOAD_NOTES_FAILURE,
  LOAD_NOTES_SUCCESS,
  type NotesAction,
} from "./actions";
import { initialNotesState, type NotesState } from "./types";
import type { ProcessedNote } from "../../../domain/ProcessedNote";

export const notesReducer: Reducer<NotesState> = (
  state: NotesState = initialNotesState,
  action
): NotesState => {
  const typed = action as NotesAction;
  switch (typed.type) {
    case LOAD_NOTES:
      return { ...state, isLoadingList: true, lastListError: null };

    case LOAD_NOTES_SUCCESS: {
      const notes = (typed as { payload: ProcessedNote[] }).payload;
      const byId = notes.reduce<Record<string, ProcessedNote>>((acc, note) => {
        acc[note.id] = note;
        return acc;
      }, {});
      return { ...state, byId, isLoadingList: false };
    }

    case LOAD_NOTES_FAILURE:
      return {
        ...state,
        isLoadingList: false,
        lastListError: (typed as { payload: string }).payload,
      };

    case LOAD_NOTE_SUCCESS: {
      const note = (typed as { payload: ProcessedNote }).payload;
      return { ...state, byId: { ...state.byId, [note.id]: note } };
    }

    case DELETE_NOTE: {
      const id = (typed as { payload: string }).payload;
      return { ...state, deletingIds: { ...state.deletingIds, [id]: true } };
    }

    case DELETE_NOTE_SUCCESS: {
      const id = (typed as { payload: string }).payload;
      const { [id]: _removedNote, ...restById } = state.byId;
      const { [id]: _removedDeleting, ...restDeletingIds } = state.deletingIds;
      return { ...state, byId: restById, deletingIds: restDeletingIds };
    }

    case DELETE_NOTE_FAILURE: {
      const { id } = (typed as { payload: { id: string; error: string } }).payload;
      const { [id]: _removedDeleting, ...restDeletingIds } = state.deletingIds;
      return { ...state, deletingIds: restDeletingIds };
    }

    case CREATE_NOTE:
      return { ...state, isSubmitting: true };

    case CREATE_NOTE_SUCCESS: {
      const note = (typed as { payload: ProcessedNote }).payload;
      return { ...state, byId: { ...state.byId, [note.id]: note }, isSubmitting: false };
    }

    case CREATE_NOTE_FAILURE:
      return { ...state, isSubmitting: false };

    case EXPORT_NOTE: {
      const id = (typed as { payload: string }).payload;
      return { ...state, exportingIds: { ...state.exportingIds, [id]: true } };
    }

    case EXPORT_NOTE_SUCCESS: {
      const note = (typed as { payload: ProcessedNote }).payload;
      const { [note.id]: _removedExporting, ...restExportingIds } = state.exportingIds;
      return {
        ...state,
        byId: { ...state.byId, [note.id]: note },
        exportingIds: restExportingIds,
      };
    }

    case EXPORT_NOTE_FAILURE: {
      const { id } = (typed as { payload: { id: string; error: string } }).payload;
      const { [id]: _removedExporting, ...restExportingIds } = state.exportingIds;
      return { ...state, exportingIds: restExportingIds };
    }

    default:
      return state;
  }
};
