import { connect } from "react-redux";
import { bindActionCreators, type Dispatch } from "redux";
import type { GlobalState } from "../../store";
import {
  loadRoutines,
  runRoutineNow,
  selectAllRoutines,
  selectRoutinesError,
  selectRoutinesLoading,
  toggleRoutine,
} from "../../store/slices/routines";
import Routines from "./Routines";

const mapStateToProps = (state: GlobalState) => ({
  routines: selectAllRoutines(state),
  isLoading: selectRoutinesLoading(state),
  error: selectRoutinesError(state),
  togglingKeys: state.routines.togglingKeys,
  runningKeys: state.routines.runningKeys,
});

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      onLoad: loadRoutines,
      onToggle: toggleRoutine,
      onRunNow: runRoutineNow,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(Routines);
