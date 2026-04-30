import { FC, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import type { Dispatch } from "redux";

import type { JobStatus } from "../../domain/enums";
import {
  liveTranscriptSubscribe,
  liveTranscriptUnsubscribe,
  selectLivePartial,
  type RecordingAction,
} from "../../store/slices/recording";
import { selectJobByRecordingId } from "../../store/slices/jobs";
import {
  LiveTranscriptDot,
  LiveTranscriptHeader,
  LiveTranscriptRoot,
  LiveTranscriptText,
} from "./LiveTranscript.style";

export interface LiveTranscriptProps {
  recordingId: string;
}

const selectStatusLabel = (status: JobStatus | null, step: string | null, t: (key: string, opts?: Record<string, string>) => string): string => {
  if (status === null) return t("recording.listening");
  if (status === "Transcribing") return t("recording.processing.transcribing");
  if (status === "Correcting" && step === "LLM correction") return t("recording.processing.llmCleanup");
  if (status === "Correcting") return t("recording.processing.correcting");
  if (status === "Summarizing") return t("recording.processing.summarizing");
  if (status === "Exporting") return t("recording.processing.exporting");
  if (status === "Failed") return t("recording.processing.failed", { step: step ?? "" });
  return t("recording.listening");
};

const LiveTranscript: FC<LiveTranscriptProps> = ({ recordingId }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<Dispatch<RecordingAction>>();
  const partialSelector = useMemo(() => selectLivePartial(recordingId), [recordingId]);
  const partial = useSelector(partialSelector);
  const jobSelector = useMemo(() => selectJobByRecordingId(recordingId), [recordingId]);
  const job = useSelector(jobSelector);

  useEffect(() => {
    dispatch(liveTranscriptSubscribe(recordingId));
    return () => {
      dispatch(liveTranscriptUnsubscribe(recordingId));
    };
  }, [dispatch, recordingId]);

  const statusLabel = selectStatusLabel(job?.status ?? null, job?.currentStep ?? null, t);

  return (
    <LiveTranscriptRoot data-testid={`home-live-transcript-${recordingId}`}>
      <LiveTranscriptHeader>
        <LiveTranscriptDot />
        {t("home.liveTranscriptLabel")}
      </LiveTranscriptHeader>
      <LiveTranscriptText>{partial?.text ?? statusLabel}</LiveTranscriptText>
    </LiveTranscriptRoot>
  );
};

export default LiveTranscript;
