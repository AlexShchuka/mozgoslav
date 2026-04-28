import type { RoutineDefinition } from "../../domain/routines";

export interface RoutinesProps {
  routines: RoutineDefinition[];
  isLoading: boolean;
  error: string | null;
  togglingKeys: Record<string, true>;
  runningKeys: Record<string, true>;
  onLoad: () => void;
  onToggle: (key: string, enabled: boolean) => void;
  onRunNow: (key: string) => void;
}
