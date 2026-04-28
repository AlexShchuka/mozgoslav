import { FC } from "react";
import { useTranslation } from "react-i18next";

import type { ProcessingJobStage } from "../../domain/ProcessingJobStage";
import {
  StageDuration,
  StageError,
  StageName,
  StageRow,
  TooltipRoot,
  TooltipTitle,
} from "./StageBreakdownTooltip.style";

interface StageBreakdownTooltipProps {
  stages: ProcessingJobStage[];
}

const StageBreakdownTooltip: FC<StageBreakdownTooltipProps> = ({ stages }) => {
  const { t } = useTranslation();

  return (
    <TooltipRoot>
      <TooltipTitle>{t("queue.stages.title")}</TooltipTitle>
      {stages.map((stage) => (
        <StageRow key={stage.id}>
          <div>
            <StageName>{stage.stageName}</StageName>
            {stage.errorMessage && (
              <StageError>{t("queue.stages.failed", { error: stage.errorMessage })}</StageError>
            )}
          </div>
          {stage.durationMs !== null && stage.durationMs !== undefined && (
            <StageDuration>{t("queue.stages.duration", { ms: stage.durationMs })}</StageDuration>
          )}
        </StageRow>
      ))}
    </TooltipRoot>
  );
};

export default StageBreakdownTooltip;
