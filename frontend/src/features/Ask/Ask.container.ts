import { connect } from "react-redux";
import { bindActionCreators, type Dispatch } from "redux";

import { submitAsk } from "../../store/slices/ask/actions";
import { selectAskIsAsking, selectAskMessages } from "../../store/slices/ask/selectors";
import type { GlobalState } from "../../store";
import Ask from "./Ask";

const mapStateToProps = (state: GlobalState) => ({
  messages: selectAskMessages(state),
  isAsking: selectAskIsAsking(state),
});

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      onAsk: (question: string, includeWeb: boolean) => submitAsk(question, includeWeb),
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(Ask);
