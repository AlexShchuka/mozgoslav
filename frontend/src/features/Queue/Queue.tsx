import React, { FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ListChecks } from "lucide-react";

import Badge, { BadgeTone } from "../../components/Badge";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import ProgressBar from "../../components/ProgressBar";
import { api } from "../../api/MozgoslavApi";
import { ProcessingJob } from "../../models/ProcessingJob";
import { BACKEND_URL, API_ENDPOINTS } from "../../constants/api";
import { PageRoot, JobRow, JobHeader, JobMeta, PageTitle } from "./Queue.style";

const TERMINAL: ProcessingJob["status"][] = ["Done", "Failed"];

const toneFor = (status: ProcessingJob["status"]): BadgeTone => {
  if (status === "Done") return "success";
  if (status === "Failed") return "error";
  if (status === "Queued") return "neutral";
  return "accent";
};

const Queue: FC = () => {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);

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
        sorted.map((job) => (
          <Card key={job.id}>
            <JobHeader>
              <div>
                <strong>{job.currentStep || t(`queue.status.${job.status}` as const)}</strong>
                <JobMeta>
                  {job.id.slice(0, 8)} · {new Date(job.createdAt).toLocaleString()}
                </JobMeta>
              </div>
              <Badge tone={toneFor(job.status)}>{t(`queue.status.${job.status}` as const)}</Badge>
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
        ))
      )}
    </PageRoot>
  );
};

export default Queue;
