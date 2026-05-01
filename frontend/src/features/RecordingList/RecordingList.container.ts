import { connect } from "react-redux";
import { bindActionCreators, type Dispatch } from "redux";
import type { GlobalState } from "../../store";
import {
  cancelJob,
  pauseJobRequested,
  resumeJobRequested,
  retryJobFromStageRequested,
  selectAllJobs,
  selectStagesByJobId,
} from "../../store/slices/jobs";
import {
  loadRecordings,
  selectAllRecordings,
  selectBackendUnavailable,
  selectRecordingsError,
  selectRecordingsLoading,
} from "../../store/slices/recording";
import type { JobStage } from "../../domain";
import type { ProcessingJob } from "../../domain";
import RecordingList from "./RecordingList";

const mapStateToProps = (state: GlobalState) => {
  const allJobs = selectAllJobs(state);
  const jobsByRecordingId = allJobs.reduce<Record<string, ProcessingJob>>((acc, job) => {
    const existing = acc[job.recordingId];
    if (!existing || job.createdAt > existing.createdAt) {
      acc[job.recordingId] = job;
    }
    return acc;
  }, {});

  return {
    recordings: selectAllRecordings(state),
    isLoading: selectRecordingsLoading(state),
    isBackendUnavailable: selectBackendUnavailable(state),
    error: selectRecordingsError(state),
    jobsByRecordingId,
    stagesByJobId: selectStagesByJobId(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      onLoad: loadRecordings,
      onPauseJob: (jobId: string) => pauseJobRequested(jobId),
      onResumeJob: (jobId: string) => resumeJobRequested(jobId),
      onCancelJob: (jobId: string) => cancelJob(jobId),
      onRetryJobFromStage: (jobId: string, fromStage: JobStage, skipFailed: boolean) =>
        retryJobFromStageRequested(jobId, fromStage, skipFailed),
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(RecordingList);
