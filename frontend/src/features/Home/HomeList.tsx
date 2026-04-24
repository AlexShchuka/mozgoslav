import { FC, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText, Mic, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import { print } from "graphql";

import Badge, { BadgeTone } from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import ProgressBar from "../../components/ProgressBar";
import { graphqlClient, getGraphqlWsClient } from "../../api/graphqlClient";
import {
  MutationCancelJobDocument,
  MutationDeleteRecordingDocument,
  QueryJobsDocument,
  QueryRecordingsDocument,
  QueryRecordingWithNotesDocument,
  SubscriptionJobProgressDocument,
} from "../../api/gql/graphql";
import type { SubscriptionJobProgressSubscription } from "../../api/gql/graphql";
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
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [openingNoteIds, setOpeningNoteIds] = useState<Set<string>>(() => new Set());
  const [cancellingJobIds, setCancellingJobIds] = useState<Set<string>>(() => new Set());
  const [deletingRecordingIds, setDeletingRecordingIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [recData, jobData] = await Promise.all([
          graphqlClient.request(QueryRecordingsDocument, { first: 200 }),
          graphqlClient.request(QueryJobsDocument, { first: 200 }),
        ]);
        if (!cancelled) {
          setRecordings((recData.recordings?.nodes ?? []) as unknown as Recording[]);
          setJobs((jobData.jobs?.nodes ?? []) as unknown as ProcessingJob[]);
        }
      } catch {}
    })();

    const wsClient = getGraphqlWsClient();
    const unsubscribe = wsClient.subscribe<SubscriptionJobProgressSubscription>(
      { query: print(SubscriptionJobProgressDocument) },
      {
        next: (value) => {
          if (!value.data) return;
          const job = value.data.jobProgress as unknown as ProcessingJob;
          setJobs((prev) => {
            const idx = prev.findIndex((j) => j.id === job.id);
            if (idx === -1) return [job, ...prev];
            const next = prev.slice();
            next[idx] = { ...next[idx], ...job };
            return next;
          });
        },
        error: () => {},
        complete: () => {},
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
      void wsClient.dispose();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handler = (): void => {
      void graphqlClient
        .request(QueryRecordingsDocument, { first: 200 })
        .then((data) => setRecordings((data.recordings?.nodes ?? []) as unknown as Recording[]))
        .catch(() => {});
    };
    window.addEventListener(RECORDINGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(RECORDINGS_CHANGED_EVENT, handler);
  }, []);

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

  const openNote = async (recordingId: string): Promise<void> => {
    if (openingNoteIds.has(recordingId)) return;
    setOpeningNoteIds((prev) => new Set(prev).add(recordingId));
    try {
      const data = await graphqlClient.request(QueryRecordingWithNotesDocument, {
        id: recordingId,
      });
      const notes = data.recording?.notes ?? [];
      if (notes.length === 0) {
        toast.info(t("home.noNoteYet"));
        return;
      }
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

  const deleteRecording = async (rec: Recording): Promise<void> => {
    const confirmed = window.confirm(t("home.deleteConfirm", { name: rec.fileName }));
    if (!confirmed) return;
    setDeletingRecordingIds((prev) => new Set(prev).add(rec.id));
    try {
      await graphqlClient.request(MutationDeleteRecordingDocument, { id: rec.id });
      setRecordings((prev) => prev.filter((r) => r.id !== rec.id));
      setJobs((prev) => prev.filter((j) => j.recordingId !== rec.id));
      toast.success(t("home.deleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingRecordingIds((prev) => {
        const next = new Set(prev);
        next.delete(rec.id);
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
      await graphqlClient.request(MutationCancelJobDocument, { id: job.id });
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
            const statusText = job ? t(`queue.status.${job.status}` as const) : t("home.waiting");
            const isOpening = openingNoteIds.has(rec.id);
            const isCancelling = job !== null && cancellingJobIds.has(job.id);
            const isDeleting = deletingRecordingIds.has(rec.id);
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
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 size={14} />}
                      isLoading={isDeleting}
                      disabled={isDeleting}
                      data-testid={`home-delete-${rec.id}`}
                      onClick={() => void deleteRecording(rec)}
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
              </Card>
            );
          })
        )}
      </HomeListScroll>
    </HomeListRoot>
  );
};

export default HomeList;
