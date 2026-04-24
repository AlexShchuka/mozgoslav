import { FC, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ListChecks, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import type { Action, Dispatch } from "redux";

import Badge, { BadgeTone } from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import ProgressBar from "../../components/ProgressBar";
import { ProcessingJob } from "../../domain/ProcessingJob";
import { cancelJob as cancelJobAction, selectAllJobs } from "../../store/slices/jobs";
import { JobHeader, JobMeta, JobRow, PageRoot, PageTitle, ResumeCopy } from "./Queue.style";

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
  const dispatch = useDispatch<Dispatch<Action>>();
  const jobs = useSelector(selectAllJobs);
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(() => new Set());

  const sorted = useMemo(
    () =>
      [...jobs].sort(
        (a, b) => (TERMINAL.includes(a.status) ? 1 : -1) - (TERMINAL.includes(b.status) ? 1 : -1)
      ),
    [jobs]
  );

  const handleCancel = useCallback(
    (job: ProcessingJob) => {
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
      dispatch(cancelJobAction(job.id));
      void Promise.resolve().then(() => {
        setCancellingIds((prev) => {
          const next = new Set(prev);
          next.delete(job.id);
          return next;
        });
      });
    },
    [t, dispatch]
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
                      onClick={() => handleCancel(job)}
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
                    job.status === "Failed" ? "error" : job.status === "Done" ? "success" : "active"
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
