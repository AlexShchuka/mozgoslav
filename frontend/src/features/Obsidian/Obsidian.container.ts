import { connect } from "react-redux";
import { bindActionCreators, type Dispatch } from "redux";

import type { GlobalState } from "../../store";
import {
  fetchDiagnostics,
  reapplyBootstrap,
  reinstallPlugins,
  selectObsidianDiagnostics,
  selectObsidianDiagnosticsError,
  selectObsidianDiagnosticsLoading,
  selectObsidianIsReapplyingBootstrap,
  selectObsidianIsReinstallingPlugins,
  selectObsidianIsSetupInProgress,
  setupObsidian,
} from "../../store/slices/obsidian";
import {
  resetWizard,
  runWizardStep,
  selectWizardCurrentStep,
  selectWizardError,
  selectWizardIsComplete,
  selectWizardIsStepRunning,
  selectWizardNextStep,
} from "../../store/slices/obsidianWizard";
import { loadSettings, saveSettings, selectSettings } from "../../store/slices/settings";
import Obsidian from "./Obsidian";
import type { ObsidianDispatchProps, ObsidianStateProps } from "./types";

const mapStateToProps = (state: GlobalState): ObsidianStateProps => ({
  settings: selectSettings(state),
  isSetupInProgress: selectObsidianIsSetupInProgress(state),
  diagnostics: selectObsidianDiagnostics(state),
  isDiagnosticsLoading: selectObsidianDiagnosticsLoading(state),
  diagnosticsError: selectObsidianDiagnosticsError(state),
  isReapplyingBootstrap: selectObsidianIsReapplyingBootstrap(state),
  isReinstallingPlugins: selectObsidianIsReinstallingPlugins(state),
  wizardCurrentStep: selectWizardCurrentStep(state),
  wizardNextStep: selectWizardNextStep(state),
  wizardIsStepRunning: selectWizardIsStepRunning(state),
  wizardIsComplete: selectWizardIsComplete(state),
  wizardError: selectWizardError(state),
});

const mapDispatchToProps = (dispatch: Dispatch): ObsidianDispatchProps =>
  bindActionCreators(
    {
      onLoadSettings: loadSettings,
      onSaveSettings: saveSettings,
      onSetup: setupObsidian,
      onFetchDiagnostics: fetchDiagnostics,
      onReapplyBootstrap: reapplyBootstrap,
      onReinstallPlugins: reinstallPlugins,
      onRunWizardStep: runWizardStep,
      onResetWizard: resetWizard,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(Obsidian);
