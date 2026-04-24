import type { ProcessingJob } from "../domain/ProcessingJob";
import type { ProcessedNote } from "../domain/ProcessedNote";
import type { Profile } from "../domain/Profile";
import type { Recording } from "../domain/Recording";
import type { GlobalState } from "../store/rootReducer";
import { initialJobsState, type JobsState } from "../store/slices/jobs";
import { initialProfilesState, type ProfilesState } from "../store/slices/profiles";
import { initialRecordingState, type RecordingState } from "../store/slices/recording";
import { initialUiState, type UiState } from "../store/slices/ui";
import { initialDictationState, type DictationState } from "../store/slices/dictation";
import { initialAudioDevicesState, type AudioDevicesState } from "../store/slices/audioDevices";
import { initialNotesState, type NotesState } from "../store/slices/notes";
import { initialSettingsState, type SettingsState } from "../store/slices/settings";
import { initialModelsState, type ModelsState } from "../store/slices/models";
import { initialBackupsState, type BackupsState } from "../store/slices/backups";
import { initialOnboardingState, type OnboardingState } from "../store/slices/onboarding";

export const jobsById = (jobs: readonly ProcessingJob[]): Record<string, ProcessingJob> =>
  Object.fromEntries(jobs.map((job) => [job.id, job]));

export const mockJobsState = (patch: Partial<JobsState> = {}): Pick<GlobalState, "jobs"> => ({
  jobs: { ...initialJobsState, ...patch },
});

export const recordingsById = (recordings: readonly Recording[]): Record<string, Recording> =>
  Object.fromEntries(recordings.map((rec) => [rec.id, rec]));

export const mockRecordingState = (
  patch: Partial<RecordingState> = {}
): Pick<GlobalState, "recording"> => ({
  recording: { ...initialRecordingState, ...patch },
});

export const mockUiState = (patch: Partial<UiState> = {}): Pick<GlobalState, "ui"> => ({
  ui: { ...initialUiState, ...patch },
});

export const mockDictationState = (
  patch: Partial<DictationState> = {}
): Pick<GlobalState, "dictation"> => ({
  dictation: { ...initialDictationState, ...patch },
});

export const mockAudioDevicesState = (
  patch: Partial<AudioDevicesState> = {}
): Pick<GlobalState, "audioDevices"> => ({
  audioDevices: { ...initialAudioDevicesState, ...patch },
});

export const notesById = (notes: readonly ProcessedNote[]): Record<string, ProcessedNote> =>
  Object.fromEntries(notes.map((n) => [n.id, n]));

export const mockNotesState = (patch: Partial<NotesState> = {}): Pick<GlobalState, "notes"> => ({
  notes: { ...initialNotesState, ...patch },
});

export const mockSettingsState = (
  patch: Partial<SettingsState> = {}
): Pick<GlobalState, "settings"> => ({
  settings: { ...initialSettingsState, ...patch },
});

export const mockModelsState = (patch: Partial<ModelsState> = {}): Pick<GlobalState, "models"> => ({
  models: { ...initialModelsState, ...patch },
});

export const profilesById = (profiles: readonly Profile[]): Record<string, Profile> =>
  Object.fromEntries(profiles.map((p) => [p.id, p]));

export const mockProfilesState = (
  patch: Partial<ProfilesState> = {}
): Pick<GlobalState, "profiles"> => ({
  profiles: { ...initialProfilesState, ...patch },
});

export const mockBackupsState = (
  patch: Partial<BackupsState> = {}
): Pick<GlobalState, "backups"> => ({
  backups: { ...initialBackupsState, ...patch },
});

export const mockOnboardingState = (
  patch: Partial<OnboardingState> = {}
): Pick<GlobalState, "onboarding"> => ({
  onboarding: { ...initialOnboardingState, ...patch },
});

export const mergeMockState = (...parts: Partial<GlobalState>[]): Partial<GlobalState> =>
  Object.assign({}, ...parts);
