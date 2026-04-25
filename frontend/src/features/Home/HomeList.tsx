import { FC, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText, Mic, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import type { Action, Dispatch } from "redux";

import Badge, { BadgeTone } from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import ProgressBar from "../../components/ProgressBar";
import { RECORDINGS_CHANGED_EVENT } from "../../constants/events";
import { noteRoute } from "../../constants/routes";
import type { ProcessingJob } from "../../domain/ProcessingJob";
import type { Recording } from "../../domain/Recording";
import {
  deleteRecording as deleteRecordingAction,
  loadRecordings,
  selectAllRecordings,
  selectDeletingRecordingIds,
} from "../../store/slices/recording";
import { cancelJob as cancelJobAction, selectAllJobs } from "../../store/slices/jobs";
import {
  clearOpenNoteResolution,
  openNoteRequested,
  selectAllOpenNoteResolutions,
} from "../../store/slices/ui";
import {
  HomeListHeader,
  HomeListRoot,
  HomeListScroll,
  RowMeta,
  RowRight,
  RowTitle,
  RowTop,
} from "./HomeList.style";
import LiveTranscript from "./LiveTranscript";

const TERMINAL: ProcessingJob["status"][] = ["Done", "Failed", "Cancelled"];

const toneFor = (status: ProcessingJob["status"] | null): BadgeTone => {
  if (status === "Done") return "success";
  if (status === "Failed") return "error";
  if (status === "Cancelled") return "neutral";
  if (status === "Queued") return "neutral";
  if (status === null) return "neutral";
  return "accent";
};

const HomeList: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch<Dispatch<Action>>();

  const recordings = useSelector(selectAllRecordings);
  const jobs = useSelector(selectAllJobs);
  const deletingIds = useSelector(selectDeletingRecordingIds);
  const openNoteResolutions = useSelector(selectAllOpenNoteResolutions);

  const prevDeletingIdsRef = useRef<Record<string, true>>({});

  useEffect(() => {
    dispatch(loadRecordings() as never);
  }, [dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handler = (): void => {
      dispatch(loadRecordings() as never);
    };
    window.addEventListener(RECORDINGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(RECORDINGS_CHANGED_EVENT, handler);
  }, [dispatch]);

  useEffect(() => {
    for (const [recordingId, resolution] of Object.entries(openNoteResolutions)) {
      if (resolution.status === "pending") continue;

      if (resolution.status === "resolved") {
        if (resolution.firstNoteId !== null) {
          navigate(noteRoute(resolution.firstNoteId));
        } else {
          toast.info(t("home.noNoteYet"));
        }
      } else {
        toast.error(resolution.error);
      }

      dispatch(clearOpenNoteResolution(recordingId) as never);
    }
  }, [openNoteResolutions, navigate, dispatch, t]);

  useEffect(() => {
    const prevIds = prevDeletingIdsRef.current;
    const deletedIds = Object.keys(prevIds).filter((id) => !(id in deletingIds));
    const recordingsById = Object.fromEntries(recordings.map((r) => [r.id, r]));
    for (const id of deletedIds) {
      if (!(id in recordingsById)) {
        toast.success(t("home.deleted"));
      }
    }
    prevDeletingIdsRef.current = deletingIds;
  }, [deletingIds, recordings, t]);

  const latestJobByRecording = useMemo(() => {
    const map = new Map<string, ProcessingJob>();
    for (const job of jobs) {
      const existing = map.get(job.recordingId);
      if (!existing || job.createdAt > existing.createdAt) {
        map.set(job.recordingId, job);
      }
    }
    return map;
  }, [jobs]);

  const sortedRecordings = useMemo(
    () => [...recordings].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [recordings]
  );

  const openNote = (recordingId: string): void => {
    if (openNoteResolutions[recordingId]?.status === "pending") return;
    dispatch(openNoteRequested(recordingId) as never);
  };

  const deleteRecording = (rec: Recording): void => {
    const confirmed = window.confirm(t("home.deleteConfirm", { name: rec.fileName }));
    if (!confirmed) return;
    dispatch(deleteRecordingAction(rec.id) as never);
  };

  const cancelJob = (job: ProcessingJob): void => {
    if (!TERMINAL.includes(job.status) && job.status !== "Queued") {
      const ok = window.confirm(t("queue.cancelConfirmRunning"));
      if (!ok) return;
    }
    dispatch(cancelJobAction(job.id) as never);
  };

  return (
    <HomeListRoot>
      <HomeListHeader>{t("home.listTitle")}</HomeListHeader>
      <HomeListScroll data-testid="home-list-scroll">
        {sortedRecordings.length === 0 ? (
          <EmptyState title={t("home.empty")} icon={<Mic size={28} />} />
        ) : (
          sortedRecordings.map((rec) => {
            const job = latestJobByRecording.get(rec.id) ?? null;
            const isTerminal = job === null || TERMINAL.includes(job.status);
            const isDone = job?.status === "Done";
            const progress = job?.progress ?? (isDone ? 100 : 0);
            const indeterminate = job !== null && !isTerminal && progress === 0;
            const statusText = job ? t(`queue.status.${job.status}` as const) : t("home.waiting");
            const isOpening = openNoteResolutions[rec.id]?.status === "pending";
            const isDeleting = rec.id in deletingIds;
            return (
              <Card key={rec.id} data-testid={`home-row-${rec.id}`}>
                <RowTop>
                  <div>
                    <RowTitle>{rec.fileName}</RowTitle>
                    <RowMeta>
                      {new Date(rec.createdAt).toLocaleString()}
                      {job?.currentStep ? ` · ${job.currentStep}` : ""}
                    </RowMeta>
                  </div>
                  <RowRight>
                    <Badge tone={toneFor(job?.status ?? null)}>{statusText}</Badge>
                    {isDone && (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<FileText size={14} />}
                        isLoading={isOpening}
                        disabled={isOpening}
                        data-testid={`home-open-note-${rec.id}`}
                        onClick={() => openNote(rec.id)}
                      >
                        {t("home.openNote")}
                      </Button>
                    )}
                    {job !== null && !isTerminal && (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<X size={14} />}
                        data-testid={`home-cancel-${rec.id}`}
                        onClick={() => cancelJob(job)}
                      >
                        {t("queue.cancel")}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 size={14} />}
                      isLoading={isDeleting}
                      disabled={isDeleting}
                      data-testid={`home-delete-${rec.id}`}
                      onClick={() => deleteRecording(rec)}
                    >
                      {t("common.delete")}
                    </Button>
                  </RowRight>
                </RowTop>
                <ProgressBar
                  value={progress}
                  status={job?.status === "Failed" ? "error" : isDone ? "success" : "active"}
                  label={job?.errorMessage ?? undefined}
                  indeterminate={indeterminate}
                />
                {rec.status === "New" && <LiveTranscript recordingId={rec.id} />}
              </Card>
            );
          })
        )}
      </HomeListScroll>
    </HomeListRoot>
  );
};

export default HomeList;
