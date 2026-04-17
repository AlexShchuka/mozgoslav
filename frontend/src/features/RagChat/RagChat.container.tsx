import { FC, useCallback } from "react";
import { connect } from "react-redux";
import { bindActionCreators, type Dispatch } from "redux";
import { useNavigate } from "react-router-dom";

import { askQuestion, selectRagIsAsking, selectRagMessages } from "../../store/slices/rag";
import type { RagCitation, RagMessage } from "../../store/slices/rag/types";
import type { GlobalState } from "../../store";
import { noteRoute } from "../../constants/routes";
import RagChat from "./RagChat";

interface StateProps {
  readonly messages: readonly RagMessage[];
  readonly isAsking: boolean;
}

interface DispatchProps {
  readonly onAsk: (question: string) => void;
}

const mapStateToProps = (state: GlobalState): StateProps => ({
  messages: selectRagMessages(state),
  isAsking: selectRagIsAsking(state),
});

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      onAsk: (question: string) => askQuestion(question),
    },
    dispatch,
  );

type Wired = StateProps & DispatchProps;

// Navigation is tied to the router, not redux — the connected wrapper injects
// it locally, keeping the presentational component fully props-driven.
const RagChatContainer: FC<Wired> = (props) => {
  const navigate = useNavigate();
  const onCitationNavigate = useCallback(
    (citation: RagCitation) =>
      navigate(`${noteRoute(citation.noteId)}?segment=${encodeURIComponent(citation.chunkId)}`),
    [navigate],
  );
  return (
    <RagChat
      messages={props.messages}
      isAsking={props.isAsking}
      onAsk={props.onAsk}
      onCitationNavigate={onCitationNavigate}
    />
  );
};

export default connect(mapStateToProps, mapDispatchToProps)(RagChatContainer);
