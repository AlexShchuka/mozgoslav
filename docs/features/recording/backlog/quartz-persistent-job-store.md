# quartz persistent job store

Durable business state lives in the `processing_jobs` table plus a rehydrator; Quartz runs with RAM triggers. A persistent job store only pays off when multi-node scheduling or restart-without-rehydrator becomes a concrete need.
