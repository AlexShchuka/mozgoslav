import { FC, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText, Mic, X } from "lucide-react";
import { toast } from "react-toastify";

import Badge, { BadgeTone } from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import ProgressBar from "../../components/ProgressBar";
import { apiFactory } from "../../api";
import { API_ENDPOINTS, BACKEND_URL } from "../../constants/api";
import { RECORDINGS_CHANGED_EVENT } from "../../constants/events";
import { noteRoute } from "../../constants/routes";
import type { ProcessingJob } from "../../domain/ProcessingJob";
import type { Recording } from "../../domain/Recording";
import {
  HomeListHeader,
  HomeListRoot,
  HomeListScroll,
  RowMeta,
  RowRight,
  RowTitle,
  RowTop,
} from "./HomeList.style";

const recordingsApi = apiFactory.createRecordingApi();
const jobsApi = apiFactory.createJobsApi();

// ADR-015 — `Cancelled` joins Done/Failed as a terminal state.
const TERMINAL: ProcessingJob["status"][] = ["Done", "Failed", "Cancelled"];

const toneFor = (status: ProcessingJob["status"] | null): BadgeTone => {
  if (status === "Done") return "success";
  if (status === "Failed") return "error";
  if (status === "Cancelled") return "neutral";
  if (status === "Queued") return "neutral";
  if (status === null) return "neutral";
  return "accent";
};

/**
 * Unified home list — one row per Recording, ordered newest first. Each row
 * shows the recording's current pipeline state: if an active ProcessingJob
 * exists, the row renders the job's live progress bar and step; otherwise the
 * bar is 100% (Done-backed recording) or idle (recording awaiting processing).
 * Replaces the previous `/` screen which rendered Queue + NotesList as two
 * separate components — the merge removes the mental context switch for what
 * was always one timeline.
 */
const HomeList: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  // BC-014 — bump to reopen the SSE EventSource after network hiccups. Mirrors
  // the pattern used by the retired Queue feature.
  const [reconnectKey, setReconnectKey] = useState(0);
  const [openingNoteIds, setOpeningNoteIds] = useState<Set<string>>(() => new Set());
  const [cancellingJobIds, setCancellingJobIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [rec, job] = await Promise.all([recordingsApi.getAll(), jobsApi.list()]);
        if (!cancelled) {
          setRecordings(rec);
          setJobs(job);
        }
      } catch {
        // Tolerated: the SSE stream fills jobs in; recordings re-fetch on the
        // next mount. A toast per boot is noisy when the backend is still
        // coming up during first run.
      }
    })();

    const es = new EventSource(`${BACKEND_URL}${API_ENDPOINTS.jobsStream}`);
    es.addEventListener("job", (ev) => {
      const job = JSON.parse((ev as MessageEvent).data) as ProcessingJob;
      setJobs((prev) => {
        const idx = prev.findIndex((j) => j.id === job.id);
        if (idx === -1) return [job, ...prev];
        const next = prev.slice();
        next[idx] = { ...next[idx], ...job };
        return next;
      });
    });
    es.onerror = () => {
      es.close();
      setReconnectKey((k) => k + 1);
    };

    return () => {
      cancelled = true;
      es.close();
    };
  }, [reconnectKey]);

  // Refetch recordings whenever Dashboard publishes a new import / recorded
  // file — SSE only covers ProcessingJob updates, so Recording creation
  // needs its own notify channel.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handler = (): void => {
      void recordingsApi.getAll().then(setRecordings).catch(() => {
        // Tolerated: the next user action will retry.
      });
    };
    window.addEventListener(RECORDINGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(RECORDINGS_CHANGED_EVENT, handler);
  }, []);

  // Latest-by-createdAt ProcessingJob per recording. The worker reprocess flow
  // (POST /api/recordings/{id}/reprocess) creates a fresh job, so a recording
  // can have several rows — we always surface the latest.
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
    [recordings],
  );

  const openNote = async (recordingId: string): Promise<void> => {
    if (openingNoteIds.has(recordingId)) return;
    setOpeningNoteIds((prev) => new Set(prev).add(recordingId));
    try {
      const notes = await recordingsApi.getNotes(recordingId);
      if (notes.length === 0) {
        toast.info(t("home.noNoteYet"));
        return;
      }
      // Most recent note first — matches the repository ordering.
      navigate(noteRoute(notes[0]!.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setOpeningNoteIds((prev) => {
        const next = new Set(prev);
        next.delete(recordingId);
        return next;
      });
    }
  };

  const cancelJob = async (job: ProcessingJob): Promise<void> => {
    if (!TERMINAL.includes(job.status) && job.status !== "Queued") {
      const ok = window.confirm(t("queue.cancelConfirmRunning"));
      if (!ok) return;
    }
    setCancellingJobIds((prev) => new Set(prev).add(job.id));
    try {
      await jobsApi.cancel(job.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setCancellingJobIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
    }
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
            const statusText = job
              ? t(`queue.status.${job.status}` as const)
              : t("home.waiting");
            const isOpening = openingNoteIds.has(rec.id);
            const isCancelling = job !== null && cancellingJobIds.has(job.id);
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
                        onClick={() => void openNote(rec.id)}
                      >
                        {t("home.openNote")}
                      </Button>
                    )}
                    {job !== null && !isTerminal && (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<X size={14} />}
                        isLoading={isCancelling}
                        disabled={isCancelling}
                        data-testid={`home-cancel-${rec.id}`}
                        onClick={() => void cancelJob(job)}
                      >
                        {t("queue.cancel")}
                      </Button>
                    )}
                  </RowRight>
                </RowTop>
                <ProgressBar
                  value={progress}
                  status={
                    job?.status === "Failed"
                      ? "error"
                      : isDone
                        ? "success"
                        : "active"
                  }
                  label={job?.errorMessage ?? undefined}
                  indeterminate={indeterminate}
                />
              </Card>
            );
          })
        )}
      </HomeListScroll>
    </HomeListRoot>
  );
};

export default HomeList;
