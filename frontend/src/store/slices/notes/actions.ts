import type { ProcessedNote } from "../../../domain/ProcessedNote";

export const LOAD_NOTES = "notes/LOAD_NOTES";
export const LOAD_NOTES_SUCCESS = "notes/LOAD_NOTES_SUCCESS";
export const LOAD_NOTES_FAILURE = "notes/LOAD_NOTES_FAILURE";

export const LOAD_NOTE = "notes/LOAD_NOTE";
export const LOAD_NOTE_SUCCESS = "notes/LOAD_NOTE_SUCCESS";
export const LOAD_NOTE_FAILURE = "notes/LOAD_NOTE_FAILURE";

export const DELETE_NOTE = "notes/DELETE_NOTE";
export const DELETE_NOTE_SUCCESS = "notes/DELETE_NOTE_SUCCESS";
export const DELETE_NOTE_FAILURE = "notes/DELETE_NOTE_FAILURE";

export const CREATE_NOTE = "notes/CREATE_NOTE";
export const CREATE_NOTE_SUCCESS = "notes/CREATE_NOTE_SUCCESS";
export const CREATE_NOTE_FAILURE = "notes/CREATE_NOTE_FAILURE";

export const EXPORT_NOTE = "notes/EXPORT_NOTE";
export const EXPORT_NOTE_SUCCESS = "notes/EXPORT_NOTE_SUCCESS";
export const EXPORT_NOTE_FAILURE = "notes/EXPORT_NOTE_FAILURE";

export interface LoadNotesAction {
  type: typeof LOAD_NOTES;
}

export interface LoadNotesSuccessAction {
  type: typeof LOAD_NOTES_SUCCESS;
  payload: ProcessedNote[];
}

export interface LoadNotesFailureAction {
  type: typeof LOAD_NOTES_FAILURE;
  payload: string;
}

export interface LoadNoteAction {
  type: typeof LOAD_NOTE;
  payload: string;
}

export interface LoadNoteSuccessAction {
  type: typeof LOAD_NOTE_SUCCESS;
  payload: ProcessedNote;
}

export interface LoadNoteFailureAction {
  type: typeof LOAD_NOTE_FAILURE;
  payload: { id: string; error: string };
}

export interface DeleteNoteAction {
  type: typeof DELETE_NOTE;
  payload: string;
}

export interface DeleteNoteSuccessAction {
  type: typeof DELETE_NOTE_SUCCESS;
  payload: string;
}

export interface DeleteNoteFailureAction {
  type: typeof DELETE_NOTE_FAILURE;
  payload: { id: string; error: string };
}

export interface CreateNoteAction {
  type: typeof CREATE_NOTE;
  payload: { title: string; body: string };
}

export interface CreateNoteSuccessAction {
  type: typeof CREATE_NOTE_SUCCESS;
  payload: ProcessedNote;
}

export interface CreateNoteFailureAction {
  type: typeof CREATE_NOTE_FAILURE;
  payload: string;
}

export interface ExportNoteAction {
  type: typeof EXPORT_NOTE;
  payload: string;
}

export interface ExportNoteSuccessAction {
  type: typeof EXPORT_NOTE_SUCCESS;
  payload: ProcessedNote;
}

export interface ExportNoteFailureAction {
  type: typeof EXPORT_NOTE_FAILURE;
  payload: { id: string; error: string };
}

export type NotesAction =
  | LoadNotesAction
  | LoadNotesSuccessAction
  | LoadNotesFailureAction
  | LoadNoteAction
  | LoadNoteSuccessAction
  | LoadNoteFailureAction
  | DeleteNoteAction
  | DeleteNoteSuccessAction
  | DeleteNoteFailureAction
  | CreateNoteAction
  | CreateNoteSuccessAction
  | CreateNoteFailureAction
  | ExportNoteAction
  | ExportNoteSuccessAction
  | ExportNoteFailureAction;

export const loadNotes = (): LoadNotesAction => ({
  type: LOAD_NOTES,
});

export const loadNotesSuccess = (notes: ProcessedNote[]): LoadNotesSuccessAction => ({
  type: LOAD_NOTES_SUCCESS,
  payload: notes,
});

export const loadNotesFailure = (message: string): LoadNotesFailureAction => ({
  type: LOAD_NOTES_FAILURE,
  payload: message,
});

export const loadNote = (id: string): LoadNoteAction => ({
  type: LOAD_NOTE,
  payload: id,
});

export const loadNoteSuccess = (note: ProcessedNote): LoadNoteSuccessAction => ({
  type: LOAD_NOTE_SUCCESS,
  payload: note,
});

export const loadNoteFailure = (payload: { id: string; error: string }): LoadNoteFailureAction => ({
  type: LOAD_NOTE_FAILURE,
  payload,
});

export const deleteNote = (id: string): DeleteNoteAction => ({
  type: DELETE_NOTE,
  payload: id,
});

export const deleteNoteSuccess = (id: string): DeleteNoteSuccessAction => ({
  type: DELETE_NOTE_SUCCESS,
  payload: id,
});

export const deleteNoteFailure = (payload: {
  id: string;
  error: string;
}): DeleteNoteFailureAction => ({
  type: DELETE_NOTE_FAILURE,
  payload,
});

export const createNote = (input: { title: string; body: string }): CreateNoteAction => ({
  type: CREATE_NOTE,
  payload: input,
});

export const createNoteSuccess = (note: ProcessedNote): CreateNoteSuccessAction => ({
  type: CREATE_NOTE_SUCCESS,
  payload: note,
});

export const createNoteFailure = (message: string): CreateNoteFailureAction => ({
  type: CREATE_NOTE_FAILURE,
  payload: message,
});

export const exportNote = (id: string): ExportNoteAction => ({
  type: EXPORT_NOTE,
  payload: id,
});

export const exportNoteSuccess = (note: ProcessedNote): ExportNoteSuccessAction => ({
  type: EXPORT_NOTE_SUCCESS,
  payload: note,
});

export const exportNoteFailure = (payload: {
  id: string;
  error: string;
}): ExportNoteFailureAction => ({
  type: EXPORT_NOTE_FAILURE,
  payload,
});
