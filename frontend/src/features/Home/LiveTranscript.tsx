import { FC, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
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

const STATUS_I18N_KEYS: Record<JobStatus, string> = {
  Queued: "pipeline.status.Queued",
  PreflightChecks: "pipeline.status.PreflightChecks",
  Transcribing: "pipeline.status.Transcribing",
  Correcting: "pipeline.status.Correcting",
  Summarizing: "pipeline.status.Summarizing",
  Exporting: "pipeline.status.Exporting",
  Done: "pipeline.status.Done",
  Failed: "pipeline.status.Failed",
  Cancelled: "pipeline.status.Cancelled",
  Paused: "pipeline.status.Paused",
};

const tStr = (t: TFunction, key: string): string => (t as (k: string) => string)(key);

const selectStatusLabel = (
  status: JobStatus | null,
  userHint: string | null,
  t: TFunction
): string => {
  if (status === null) return tStr(t, "home.liveTranscriptWaiting");
  if (status === "Failed" && userHint) return userHint;
  return tStr(t, STATUS_I18N_KEYS[status]);
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

  const statusLabel = selectStatusLabel(job?.status ?? null, job?.userHint ?? null, t);

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
