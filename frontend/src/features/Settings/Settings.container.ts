import { connect } from "react-redux";
import { bindActionCreators, type Dispatch } from "redux";

import type { GlobalState } from "../../store";
import {
  checkLlm,
  loadLlmCapabilities,
  loadLlmModelsRequested,
  loadSettings,
  saveSettings,
  selectLlmCapabilities,
  selectLlmModels,
  selectLlmModelsError,
  selectLlmModelsLoading,
  selectLlmProbing,
  selectSettings,
  selectSettingsLoading,
  selectSettingsSaving,
} from "../../store/slices/settings";
import Settings from "./Settings";
import type { SettingsDispatchProps, SettingsStateProps } from "./types";

const mapStateToProps = (state: GlobalState): SettingsStateProps => ({
  settings: selectSettings(state),
  isLoading: selectSettingsLoading(state),
  isSaving: selectSettingsSaving(state),
  isLlmProbing: selectLlmProbing(state),
  llmCapabilities: selectLlmCapabilities(state),
  llmModels: selectLlmModels(state),
  llmModelsLoading: selectLlmModelsLoading(state),
  llmModelsError: selectLlmModelsError(state),
});

const mapDispatchToProps = (dispatch: Dispatch): SettingsDispatchProps =>
  bindActionCreators(
    {
      onLoad: loadSettings,
      onSave: saveSettings,
      onCheckLlm: checkLlm,
      onLoadCapabilities: loadLlmCapabilities,
      onLoadModels: loadLlmModelsRequested,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(Settings);
