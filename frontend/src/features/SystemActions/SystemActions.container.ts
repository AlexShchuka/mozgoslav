import { connect } from "react-redux";
import { bindActionCreators, type Dispatch } from "redux";

import type { GlobalState } from "../../store";
import {
  loadSystemActionTemplates,
  selectSystemActionTemplates,
  selectSystemActionsError,
  selectSystemActionsIsLoading,
} from "../../store/slices/systemActions";
import SystemActions from "./SystemActions";

const mapStateToProps = (state: GlobalState) => ({
  templates: selectSystemActionTemplates(state),
  isLoading: selectSystemActionsIsLoading(state),
  error: selectSystemActionsError(state),
});

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      onLoad: loadSystemActionTemplates,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(SystemActions);
