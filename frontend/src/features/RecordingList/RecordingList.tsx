import { type FC, useEffect, useState } from "react";

import JobTimeline from "../../components/JobTimeline";
import GroupedList from "../../components/GroupedList";
import { formatDuration } from "../../core/utils/format";
import type { Recording } from "../../domain";
import type { RecordingListProps } from "./types";
import {
  EmptyState,
  ErrorText,
  ListHeader,
  Meta,
  Title,
  UserHintText,
} from "./RecordingList.style";

const BACKEND_UNAVAILABLE_MESSAGE = "Бэкенд не отвечает. Запусти backend.";

const RecordingList: FC<RecordingListProps> = ({
  recordings,
  isLoading,
  isBackendUnavailable,
  error,
  jobsByRecordingId,
  stagesByJobId,
  onLoad,
  onPauseJob,
  onResumeJob,
  onCancelJob,
  onRetryJobFromStage,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    onLoad();
  }, [onLoad]);

  const handleItemClick = (recording: Recording) => {
    setExpandedId((prev) => (prev === recording.id ? null : recording.id));
  };

  return (
    <section>
      <ListHeader>
        <Title>Записи</Title>
      </ListHeader>
      {error && <ErrorText data-testid="recording-error">{error}</ErrorText>}
      {isBackendUnavailable ? (
        <EmptyState data-testid="recording-empty-backend">{BACKEND_UNAVAILABLE_MESSAGE}</EmptyState>
      ) : recordings.length === 0 ? (
        <EmptyState data-testid="recording-empty">
          {isLoading ? "Загружаем…" : "Пока нет записей. Импортируй аудио, чтобы начать."}
        </EmptyState>
      ) : (
        <GroupedList
          items={recordings}
          getId={(r) => r.id}
          renderPrimary={(r) => r.fileName}
          renderSecondary={(r) => {
            const job = jobsByRecordingId[r.id];
            const hint = job?.status === "Failed" ? (job.userHint ?? job.errorMessage) : null;
            return (
              <>
                <Meta>{formatDuration(r.duration)}</Meta>
                {" · "}
                <Meta>{r.status}</Meta>
                {hint && <UserHintText data-testid={`user-hint-${r.id}`}>{hint}</UserHintText>}
              </>
            );
          }}
          renderActions={(r) => {
            const job = jobsByRecordingId[r.id];
            if (!expandedId || expandedId !== r.id || !job) {
              return null;
            }
            const stages = stagesByJobId[job.id] ?? [];
            return (
              <JobTimeline
                job={job}
                stages={stages}
                onPause={() => onPauseJob(job.id)}
                onResume={() => onResumeJob(job.id)}
                onCancel={() => onCancelJob(job.id)}
                onRetryFromStage={(stage, skipFailed) =>
                  onRetryJobFromStage(job.id, stage, skipFailed)
                }
              />
            );
          }}
          onItemClick={handleItemClick}
          data-testid="recording-list"
        />
      )}
    </section>
  );
};

export default RecordingList;
