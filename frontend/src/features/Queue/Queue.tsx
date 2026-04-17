import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { ListChecks, X } from "lucide-react";
import { toast } from "react-toastify";

import Badge, { BadgeTone } from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import ProgressBar from "../../components/ProgressBar";
import { api } from "../../api/MozgoslavApi";
import { ProcessingJob } from "../../types/ProcessingJob";
import { BACKEND_URL, API_ENDPOINTS } from "../../constants/api";
import { PageRoot, JobRow, JobHeader, JobMeta, JobMotionWrapper, PageTitle } from "./Queue.style";

const TERMINAL: ProcessingJob["status"][] = ["Done", "Failed"];

const toneFor = (status: ProcessingJob["status"]): BadgeTone => {
  if (status === "Done") return "success";
  if (status === "Failed") return "error";
  if (status === "Queued") return "neutral";
  return "accent";
};

const Queue: FC = () => {
  const { t } = useTranslation();
  const reduced = useReducedMotion() ?? false;
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [cancelling, setCancelling] = useState<Set<string>>(new Set());

  const onCancel = useCallback(async (id: string) => {
    setCancelling((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      const result = await api.cancelQueueJob(id);
      setJobs((prev) => {
        // Queued → remove outright; in-flight → reflect the Failed stamp that
        // the backend wrote (ADR-006 D-9). SSE may redundantly ship the same
        // update a moment later; reducer idempotency already handles that.
        if (result.markedFailed) {
          return prev.map((j) =>
            j.id === id
              ? { ...j, status: "Failed", errorMessage: "Cancelled by user", finishedAt: new Date().toISOString() }
              : j,
          );
        }
        return prev.filter((j) => j.id !== id);
      });
      toast.success(t("queue.cancelled"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setCancelling((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const initial = await api.listJobs();
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

    return () => {
      cancelled = true;
      es.close();
    };
  }, []);

  const sorted = useMemo(
    () => [...jobs].sort((a, b) => (TERMINAL.includes(a.status) ? 1 : -1) - (TERMINAL.includes(b.status) ? 1 : -1)),
    [jobs],
  );

  return (
    <PageRoot>
      <PageTitle>{t("queue.title")}</PageTitle>
      {sorted.length === 0 ? (
        <EmptyState title={t("queue.empty")} icon={<ListChecks size={28} />} />
      ) : (
        <AnimatePresence initial={false}>
          {sorted.map((job) => (
            <JobMotionWrapper
              key={job.id}
              layout={!reduced}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: -24, height: 0 }}
              transition={reduced ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card>
                <JobHeader>
                  <div>
                    <strong>{job.currentStep || t(`queue.status.${job.status}` as const)}</strong>
                    <JobMeta>
                      {job.id.slice(0, 8)} · {new Date(job.createdAt).toLocaleString()}
                    </JobMeta>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Badge tone={toneFor(job.status)}>{t(`queue.status.${job.status}` as const)}</Badge>
                    {!TERMINAL.includes(job.status) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<X size={14} />}
                        onClick={() => onCancel(job.id)}
                        isLoading={cancelling.has(job.id)}
                        aria-label={t("queue.cancelAria")}
                      >
                        {t("common.cancel")}
                      </Button>
                    )}
                  </div>
                </JobHeader>
                <JobRow>
                  <ProgressBar
                    value={job.progress}
                    status={job.status === "Failed" ? "error" : job.status === "Done" ? "success" : "active"}
                    label={job.errorMessage ?? undefined}
                    indeterminate={!TERMINAL.includes(job.status) && job.progress === 0}
                  />
                </JobRow>
              </Card>
            </JobMotionWrapper>
          ))}
        </AnimatePresence>
      )}
    </PageRoot>
  );
};

export default Queue;
