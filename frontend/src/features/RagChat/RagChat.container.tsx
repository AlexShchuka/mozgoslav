import { FC, useCallback, useEffect } from "react";
import { connect } from "react-redux";
import { bindActionCreators, type Dispatch } from "redux";
import { useNavigate } from "react-router-dom";

import {
  askQuestion,
  loadRagStatus,
  reindexRag,
  selectIsReindexingRag,
  selectLastReindexCount,
  selectRagIsAsking,
  selectRagMessages,
  selectRagStatus,
} from "../../store/slices/rag";
import type { RagCitation, RagMessage, RagStatus } from "../../store/slices/rag/types";
import type { GlobalState } from "../../store";
import { noteRoute } from "../../constants/routes";
import RagChat from "./RagChat";
import type { RagIndexStatus } from "./types";

interface StateProps {
  readonly messages: readonly RagMessage[];
  readonly isAsking: boolean;
  readonly ragStatus: RagStatus | null;
  readonly isReindexing: boolean;
  readonly lastReindexCount: number | null;
}

interface DispatchProps {
  readonly onAsk: (question: string) => void;
  readonly onLoadStatus: () => void;
  readonly onReindexRag: () => void;
}

const mapStateToProps = (state: GlobalState): StateProps => ({
  messages: selectRagMessages(state),
  isAsking: selectRagIsAsking(state),
  ragStatus: selectRagStatus(state),
  isReindexing: selectIsReindexingRag(state),
  lastReindexCount: selectLastReindexCount(state),
});

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      onAsk: (question: string) => askQuestion(question),
      onLoadStatus: loadRagStatus,
      onReindexRag: reindexRag,
    },
    dispatch
  );

type Wired = StateProps & DispatchProps;

const RagChatContainer: FC<Wired> = (props) => {
  const navigate = useNavigate();
  const { onLoadStatus } = props;

  useEffect(() => {
    onLoadStatus();
  }, [onLoadStatus]);

  const onCitationNavigate = useCallback(
    (citation: RagCitation) =>
      navigate(`${noteRoute(citation.noteId)}?segment=${encodeURIComponent(citation.chunkId)}`),
    [navigate]
  );

  const status: RagIndexStatus | null = props.ragStatus
    ? { chunks: props.ragStatus.chunks, notes: props.ragStatus.embeddedNotes }
    : null;

  return (
    <RagChat
      messages={props.messages}
      isAsking={props.isAsking}
      status={status}
      isReindexing={props.isReindexing}
      onAsk={props.onAsk}
      onReindex={props.onReindexRag}
      onCitationNavigate={onCitationNavigate}
    />
  );
};

export default connect(mapStateToProps, mapDispatchToProps)(RagChatContainer);
