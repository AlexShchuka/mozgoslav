import { connect } from "react-redux";
import { bindActionCreators, type Dispatch } from "redux";

import type { GlobalState } from "../../store";
import {
  monitoringReprobeRequested,
  selectMonitoringError,
  selectMonitoringIsLoading,
  selectMonitoringIsReprobing,
  selectMonitoringRuntimeState,
} from "../../store/slices/monitoring";
import Monitoring from "./Monitoring";
import type { MonitoringDispatchProps, MonitoringStateProps } from "./types";

const mapStateToProps = (state: GlobalState): MonitoringStateProps => ({
  runtimeState: selectMonitoringRuntimeState(state),
  isLoading: selectMonitoringIsLoading(state),
  isReprobing: selectMonitoringIsReprobing(state),
  error: selectMonitoringError(state),
});

const mapDispatchToProps = (dispatch: Dispatch): MonitoringDispatchProps =>
  bindActionCreators(
    {
      onReprobe: monitoringReprobeRequested,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(Monitoring);
