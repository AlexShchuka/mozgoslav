import type { RoutineDefinition } from "../../../domain/routines";

export interface RoutinesState {
  routines: RoutineDefinition[];
  isLoading: boolean;
  error: string | null;
  togglingKeys: Record<string, true>;
  runningKeys: Record<string, true>;
}

export const initialRoutinesState: RoutinesState = {
  routines: [],
  isLoading: false,
  error: null,
  togglingKeys: {},
  runningKeys: {},
};
