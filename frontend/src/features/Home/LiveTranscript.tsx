import { FC, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import type { Dispatch } from "redux";

import {
  liveTranscriptSubscribe,
  liveTranscriptUnsubscribe,
  selectLivePartial,
  type RecordingAction,
} from "../../store/slices/recording";
import {
  LiveTranscriptDot,
  LiveTranscriptHeader,
  LiveTranscriptRoot,
  LiveTranscriptText,
} from "./LiveTranscript.style";

export interface LiveTranscriptProps {
  recordingId: string;
}

const LiveTranscript: FC<LiveTranscriptProps> = ({ recordingId }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<Dispatch<RecordingAction>>();
  const partialSelector = useMemo(() => selectLivePartial(recordingId), [recordingId]);
  const partial = useSelector(partialSelector);

  useEffect(() => {
    dispatch(liveTranscriptSubscribe(recordingId));
    return () => {
      dispatch(liveTranscriptUnsubscribe(recordingId));
    };
  }, [dispatch, recordingId]);

  return (
    <LiveTranscriptRoot data-testid={`home-live-transcript-${recordingId}`}>
      <LiveTranscriptHeader>
        <LiveTranscriptDot />
        {t("home.liveTranscriptLabel")}
      </LiveTranscriptHeader>
      <LiveTranscriptText>{partial?.text ?? t("home.liveTranscriptWaiting")}</LiveTranscriptText>
    </LiveTranscriptRoot>
  );
};

export default LiveTranscript;
