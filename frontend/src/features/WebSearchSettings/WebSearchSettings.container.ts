import { connect } from "react-redux";
import { bindActionCreators, type Dispatch } from "redux";

import type { GlobalState } from "../../store";
import {
  loadWebSearchConfig,
  saveWebSearchConfig,
  selectWebSearchConfig,
  selectWebSearchIsLoading,
  selectWebSearchIsSaving,
} from "../../store/slices/webSearch";
import type { WebSearchConfig } from "../../store/slices/webSearch/types";
import WebSearchSettings from "./WebSearchSettings";

const mapStateToProps = (state: GlobalState) => ({
  config: selectWebSearchConfig(state),
  isLoading: selectWebSearchIsLoading(state),
  isSaving: selectWebSearchIsSaving(state),
});

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      onLoad: loadWebSearchConfig,
      onSave: (config: WebSearchConfig) => saveWebSearchConfig(config),
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(WebSearchSettings);
