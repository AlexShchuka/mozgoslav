import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ListChecks, X } from "lucide-react";
import { toast } from "react-toastify";

import Badge, { BadgeTone } from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import ProgressBar from "../../components/ProgressBar";
import { apiFactory } from "../../api";
import { ProcessingJob } from "../../domain/ProcessingJob";

const jobsApi = apiFactory.createJobsApi();
import { BACKEND_URL, API_ENDPOINTS } from "../../constants/api";
import { PageRoot, JobRow, JobHeader, JobMeta, PageTitle, ResumeCopy } from "./Queue.style";

// ADR-015 — `Cancelled` joins Done/Failed as a terminal state; Cancel button
// hidden and status badge rendered with a neutral tone.
const TERMINAL: ProcessingJob["status"][] = ["Done", "Failed", "Cancelled"];

const toneFor = (status: ProcessingJob["status"]): BadgeTone => {
  if (status === "Done") return "success";
  if (status === "Failed") return "error";
  if (status === "Cancelled") return "neutral";
  if (status === "Queued") return "neutral";
  return "accent";
};

const formatHHMM = (iso: string): string => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
};

const Queue: FC = () => {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(() => new Set());
  // BC-014 — the SSE stream can drop (network hiccup, backend restart). We
  // close + reopen via a reconnect-key bump; React re-runs the effect which
  // constructs a fresh EventSource.
  const [reconnectKey, setReconnectKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const initial = await jobsApi.list();
        if (!cancelled) setJobs(initial);
      } catch {
        // ignored — SSE will fill in once backend is up
      }
    })();

    const es = new EventSource(`${BACKEND_URL}${API_ENDPOINTS.jobsStream}`);
    es.addEventListener("job", (ev) => {
      const job = JSON.parse((ev as MessageEvent).data) as ProcessingJob;
      setJobs((prev) => {
        const idx = prev.findIndex((j) => j.id === job.id);
        if (idx === -1) return [job, ...prev];
        const copy = prev.slice();
        copy[idx] = { ...copy[idx], ...job };
        return copy;
      });
    });
    es.onerror = () => {
      // Close the broken source; bumping the reconnect key forces the effect
      // to re-run with a fresh EventSource on the next render.
      es.close();
      setReconnectKey((k) => k + 1);
    };

    return () => {
      cancelled = true;
      es.close();
    };
  }, [reconnectKey]);

  const sorted = useMemo(
    () =>
      [...jobs].sort(
        (a, b) =>
          (TERMINAL.includes(a.status) ? 1 : -1) - (TERMINAL.includes(b.status) ? 1 : -1),
      ),
    [jobs],
  );

  const handleCancel = useCallback(
    async (job: ProcessingJob) => {
      const isRunning = !TERMINAL.includes(job.status) && job.status !== "Queued";
      if (isRunning) {
        const ok = window.confirm(t("queue.cancelConfirmRunning"));
        if (!ok) return;
      }
      setCancellingIds((prev) => {
        const next = new Set(prev);
        next.add(job.id);
        return next;
      });
      try {
        await jobsApi.cancel(job.id);
        setJobs((prev) => prev.filter((j) => j.id !== job.id));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      } finally {
        setCancellingIds((prev) => {
          const next = new Set(prev);
          next.delete(job.id);
          return next;
        });
      }
    },
    [t],
  );

  return (
    <PageRoot>
      <PageTitle>{t("queue.title")}</PageTitle>
      {sorted.length === 0 ? (
        <EmptyState title={t("queue.empty")} icon={<ListChecks size={28} />} />
      ) : (
        sorted.map((job) => {
          const isTerminal = TERMINAL.includes(job.status);
          const showCancel = !isTerminal;
          const isCancelling = cancellingIds.has(job.id);
          return (
            <Card key={job.id}>
              <JobHeader>
                <div>
                  <strong>{job.currentStep || t(`queue.status.${job.status}` as const)}</strong>
                  <JobMeta>
                    {job.id.slice(0, 8)} · {new Date(job.createdAt).toLocaleString()}
                  </JobMeta>
                  {job.resumedFromCheckpoint && job.checkpointAt && (
                    <ResumeCopy data-testid={`queue-resumed-${job.id}`}>
                      {t("queue.resumedFrom", { time: formatHHMM(job.checkpointAt) })}
                    </ResumeCopy>
                  )}
                </div>
                <JobHeader as="div" style={{ gap: 12 }}>
                  <Badge tone={toneFor(job.status)}>
                    {t(`queue.status.${job.status}` as const)}
                  </Badge>
                  {showCancel && (
                    <Button
                      variant="ghost"
                      data-testid={`queue-cancel-${job.id}`}
                      leftIcon={<X size={14} />}
                      isLoading={isCancelling}
                      disabled={isCancelling}
                      onClick={() => void handleCancel(job)}
                    >
                      {t("queue.cancel")}
                    </Button>
                  )}
                </JobHeader>
              </JobHeader>
              <JobRow>
                <ProgressBar
                  value={job.progress}
                  status={
                    job.status === "Failed"
                      ? "error"
                      : job.status === "Done"
                        ? "success"
                        : "active"
                  }
                  label={job.errorMessage ?? undefined}
                  indeterminate={!isTerminal && job.progress === 0}
                />
              </JobRow>
            </Card>
          );
        })
      )}
    </PageRoot>
  );
};

export default Queue;
