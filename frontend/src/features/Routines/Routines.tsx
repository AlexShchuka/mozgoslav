import { type FC, useEffect } from "react";
import { useTranslation } from "react-i18next";

import Button from "../../components/Button";
import type { RoutinesProps } from "./types";
import {
  CronSlotCard,
  EmptyState,
  ErrorText,
  LastRunInfo,
  PageTitle,
  RoutineActions,
  RoutineCard,
  RoutineDescription,
  RoutineHeader,
  RoutineInfo,
  RoutineName,
  RoutinesRoot,
  StatusBadge,
} from "./Routines.style";

const Routines: FC<RoutinesProps> = ({
  routines,
  isLoading,
  error,
  togglingKeys,
  runningKeys,
  onLoad,
  onToggle,
  onRunNow,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    onLoad();
  }, [onLoad]);

  return (
    <RoutinesRoot>
      <PageTitle>{t("routines.title")}</PageTitle>
      {error && <ErrorText data-testid="routines-error">{error}</ErrorText>}
      {routines.length === 0 && !isLoading ? (
        <EmptyState data-testid="routines-empty">{t("routines.empty")}</EmptyState>
      ) : (
        <>
          {routines.map((routine) => (
            <RoutineCard key={routine.key} data-testid={`routine-card-${routine.key}`}>
              <RoutineHeader>
                <RoutineInfo>
                  <RoutineName>{routine.displayName}</RoutineName>
                  <RoutineDescription>{routine.description}</RoutineDescription>
                </RoutineInfo>
                <RoutineActions>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={togglingKeys[routine.key] === true}
                    onClick={() => onToggle(routine.key, !routine.isEnabled)}
                    data-testid={`routine-toggle-${routine.key}`}
                  >
                    {routine.isEnabled ? t("routines.disable") : t("routines.enable")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={runningKeys[routine.key] === true || !routine.isEnabled}
                    onClick={() => onRunNow(routine.key)}
                    data-testid={`routine-run-now-${routine.key}`}
                  >
                    {runningKeys[routine.key] === true
                      ? t("routines.running")
                      : t("routines.runNow")}
                  </Button>
                </RoutineActions>
              </RoutineHeader>
              {routine.lastRun && (
                <LastRunInfo>
                  <StatusBadge $status={routine.lastRun.status}>
                    {routine.lastRun.status}
                  </StatusBadge>
                  {" · "}
                  {t("routines.lastRun")}{" "}
                  {new Date(routine.lastRun.startedAt).toLocaleString()}
                  {routine.lastRun.errorMessage && (
                    <> · {routine.lastRun.errorMessage}</>
                  )}
                </LastRunInfo>
              )}
            </RoutineCard>
          ))}
          <CronSlotCard data-testid="routines-cron-slot">
            <RoutineName>{t("routines.cronSlot.title")}</RoutineName>
            <RoutineDescription>{t("routines.cronSlot.description")}</RoutineDescription>
          </CronSlotCard>
        </>
      )}
    </RoutinesRoot>
  );
};

export default Routines;
