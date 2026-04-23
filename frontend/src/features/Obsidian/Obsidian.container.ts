import {connect} from "react-redux";
import {bindActionCreators, type Dispatch} from "redux";

import type {GlobalState} from "../../store";
import {
    applyLayout,
    bulkExport,
    fetchDiagnostics,
    reapplyBootstrap,
    reinstallPlugins,
    selectObsidianDiagnostics,
    selectObsidianDiagnosticsError,
    selectObsidianDiagnosticsLoading,
    selectObsidianIsApplyingLayout,
    selectObsidianIsBulkExporting,
    selectObsidianIsReapplyingBootstrap,
    selectObsidianIsReinstallingPlugins,
    selectObsidianIsSetupInProgress,
    setupObsidian,
} from "../../store/slices/obsidian";
import {loadSettings, saveSettings, selectSettings,} from "../../store/slices/settings";
import Obsidian from "./Obsidian";
import type {ObsidianDispatchProps, ObsidianStateProps} from "./types";

const mapStateToProps = (state: GlobalState): ObsidianStateProps => ({
    settings: selectSettings(state),
    isBulkExporting: selectObsidianIsBulkExporting(state),
    isApplyingLayout: selectObsidianIsApplyingLayout(state),
    isSetupInProgress: selectObsidianIsSetupInProgress(state),
    diagnostics: selectObsidianDiagnostics(state),
    isDiagnosticsLoading: selectObsidianDiagnosticsLoading(state),
    diagnosticsError: selectObsidianDiagnosticsError(state),
    isReapplyingBootstrap: selectObsidianIsReapplyingBootstrap(state),
    isReinstallingPlugins: selectObsidianIsReinstallingPlugins(state),
});

const mapDispatchToProps = (dispatch: Dispatch): ObsidianDispatchProps =>
    bindActionCreators(
        {
            onLoadSettings: loadSettings,
            onSaveSettings: saveSettings,
            onSetup: setupObsidian,
            onBulkExport: bulkExport,
            onApplyLayout: applyLayout,
            onFetchDiagnostics: fetchDiagnostics,
            onReapplyBootstrap: reapplyBootstrap,
            onReinstallPlugins: reinstallPlugins,
        },
        dispatch,
    );

export default connect(mapStateToProps, mapDispatchToProps)(Obsidian);
