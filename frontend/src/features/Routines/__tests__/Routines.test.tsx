import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { RoutinesContainer } from "../index";
import Routines from "../Routines";
import type { RoutineDefinition } from "../../../domain/routines";
import type { RoutinesProps } from "../types";
import { renderWithStore, mockRoutinesState, mergeMockState } from "../../../testUtils";
import {
  LOAD_ROUTINES,
  TOGGLE_ROUTINE,
  RUN_ROUTINE_NOW,
} from "../../../store/slices/routines";
import "../../../i18n";

const buildRoutine = (patch: Partial<RoutineDefinition> = {}): RoutineDefinition => ({
  key: patch.key ?? "action-extractor",
  displayName: patch.displayName ?? "Action Extractor",
  description: patch.description ?? "Extracts actions from notes",
  isEnabled: patch.isEnabled ?? true,
  lastRun: patch.lastRun ?? null,
});

const noop = jest.fn();

const buildProps = (overrides: Partial<RoutinesProps> = {}): RoutinesProps => ({
  routines: [],
  isLoading: false,
  error: null,
  togglingKeys: {},
  runningKeys: {},
  onLoad: noop,
  onToggle: noop,
  onRunNow: noop,
  ...overrides,
});

const renderRoutinesContainer = (routines: readonly RoutineDefinition[] = []) =>
  renderWithStore(
    <MemoryRouter>
      <RoutinesContainer />
    </MemoryRouter>,
    {
      preloadedState: mergeMockState(mockRoutinesState({ routines: [...routines] })),
    }
  );

const renderRoutines = (props: Partial<RoutinesProps> = {}) =>
  renderWithStore(
    <MemoryRouter>
      <Routines {...buildProps(props)} />
    </MemoryRouter>
  );

describe("Routines — UI", () => {
  beforeEach(() => {
    noop.mockClear();
  });

  it("Routines_OnMount_DispatchesLoadRoutines", () => {
    const { getActions } = renderRoutinesContainer();
    expect(getActions().some((a) => a.type === LOAD_ROUTINES)).toBe(true);
  });

  it("Routines_EmptyList_ShowsEmptyState", () => {
    renderRoutines({ routines: [], isLoading: false });
    expect(screen.getByTestId("routines-empty")).toBeInTheDocument();
  });

  it("Routines_WithRoutines_RendersCards", () => {
    const routines = [
      buildRoutine({ key: "action-extractor", displayName: "Action Extractor" }),
      buildRoutine({ key: "reminders", displayName: "Reminders" }),
    ];
    renderRoutines({ routines });

    expect(screen.getByTestId("routine-card-action-extractor")).toBeInTheDocument();
    expect(screen.getByTestId("routine-card-reminders")).toBeInTheDocument();
    expect(screen.getByText("Action Extractor")).toBeInTheDocument();
    expect(screen.getByText("Reminders")).toBeInTheDocument();
  });

  it("Routines_WithRoutines_ShowsCronSlotCard", () => {
    const routines = [buildRoutine()];
    renderRoutines({ routines });
    expect(screen.getByTestId("routines-cron-slot")).toBeInTheDocument();
  });

  it("Routines_ToggleButton_DispatchesToggleRoutine", async () => {
    const routine = buildRoutine({ key: "action-extractor", isEnabled: true });
    const { getActions } = renderRoutinesContainer([routine]);

    await userEvent.click(screen.getByTestId("routine-toggle-action-extractor"));

    await waitFor(() =>
      expect(
        getActions().some(
          (a) =>
            a.type === TOGGLE_ROUTINE &&
            a.payload.key === "action-extractor" &&
            a.payload.enabled === false
        )
      ).toBe(true)
    );
  });

  it("Routines_RunNowButton_DispatchesRunRoutineNow", async () => {
    const routine = buildRoutine({ key: "action-extractor", isEnabled: true });
    const { getActions } = renderRoutinesContainer([routine]);

    await userEvent.click(screen.getByTestId("routine-run-now-action-extractor"));

    await waitFor(() =>
      expect(
        getActions().some(
          (a) => a.type === RUN_ROUTINE_NOW && a.payload.key === "action-extractor"
        )
      ).toBe(true)
    );
  });

  it("Routines_RunNowButton_DisabledWhenRoutineDisabled", () => {
    const routine = buildRoutine({ key: "action-extractor", isEnabled: false });
    renderRoutines({ routines: [routine] });

    expect(screen.getByTestId("routine-run-now-action-extractor")).toBeDisabled();
  });

  it("Routines_WithLastRun_ShowsStatusBadge", () => {
    const routine = buildRoutine({
      key: "action-extractor",
      lastRun: {
        id: "run-1",
        routineKey: "action-extractor",
        startedAt: "2026-04-28T10:00:00Z",
        finishedAt: "2026-04-28T10:00:05Z",
        status: "Completed",
        errorMessage: null,
        payloadSummary: null,
      },
    });
    renderRoutines({ routines: [routine] });

    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("Routines_ErrorState_ShowsErrorText", () => {
    renderRoutines({ error: "Failed to load routines" });

    expect(screen.getByTestId("routines-error")).toBeInTheDocument();
    expect(screen.getByText("Failed to load routines")).toBeInTheDocument();
  });
});
