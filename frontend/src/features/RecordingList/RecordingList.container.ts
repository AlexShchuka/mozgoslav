import { connect } from "react-redux";
import { bindActionCreators, type Dispatch } from "redux";
import type { GlobalState } from "../../store";
import {
  loadRecordings,
  selectAllRecordings,
  selectBackendUnavailable,
  selectRecordingsError,
  selectRecordingsLoading,
} from "../../store/slices/recording";
import RecordingList from "./RecordingList";

const mapStateToProps = (state: GlobalState) => ({
  recordings: selectAllRecordings(state),
  isLoading: selectRecordingsLoading(state),
  isBackendUnavailable: selectBackendUnavailable(state),
  error: selectRecordingsError(state),
});

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      onLoad: loadRecordings,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(RecordingList);
