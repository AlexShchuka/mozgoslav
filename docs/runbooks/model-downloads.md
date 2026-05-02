# Runbook — Model Downloads Manager

See [Issue #280](https://github.com/AlexShchuka/mozgoslav/issues/280) for the full decision record.

## State diagram

```
Queued → Downloading (semaphore acquired)
       → Cancelled (user cancel while queued — instant, no HTTP)

Downloading → Downloading (transient retry with Range: bytes=<offset>-)
           → Finalizing (all bytes received)
           → Failed/Transient (max retries exhausted, *.partial preserved)
           → Failed/NotFound (HTTP 404/410, *.partial deleted)
           → Failed/Unknown (other 4xx / IOException, *.partial deleted)
           → Cancelled (user cancel, *.partial deleted)

Finalizing → Completed (SHA OK + Move)
           → Failed/Sha (SHA mismatch after Move, destination deleted)
           → Failed/Unknown (Move exception, *.partial deleted)
           (cancel during Finalizing is rejected with CANNOT_CANCEL_FINALIZING)

Failed → (new job via mutation downloadModel)
       → new Queued job (fresh start if ErrorKind = Sha/NotFound/Unknown)
       → new Queued job with Range (resume from *.partial if ErrorKind = Transient)

Cancelled → (new job via mutation downloadModel — fresh start, *.partial already deleted)
Completed → (mutation returns ALREADY_INSTALLED if destination file exists)
```

## Post-merge: drop local mozgoslav.db

`EnsureCreatedAsync` is **not** a migration tool. After pulling this MR on any dev machine, delete the local database so that the new `DownloadJobs` table is created fresh:

```bash
rm -f "$HOME/Library/Application Support/Mozgoslav/mozgoslav.db"
```

The app will recreate it automatically on next start.

## What to do when a download is stuck in Failed

1. Identify the `DownloadJob` row:

```sql
SELECT Id, CatalogueId, State, ErrorKind, ErrorMessage, BytesReceived, TotalBytes
FROM DownloadJobs
WHERE State = 'Failed'
ORDER BY CreatedAt DESC
LIMIT 10;
```

2. If `ErrorKind = 'Transient'` — the `.partial` file is still on disk. The user can click **Retry** in the Downloads Drawer, which calls `mutation downloadModel(catalogueId)`. A new job is created; it uses a `Range: bytes=<existing>-` request to resume from where it left off.

3. If `ErrorKind = 'Sha'` or `'NotFound'` — the `.partial` file was already deleted during the failure transition. The user clicks **Retry**; a new job starts from byte 0.

## How to remove a stale DownloadJob row from SQLite manually

Connect to the SQLite database at `~/Library/Application Support/Mozgoslav/mozgoslav.db` using any SQLite client, then run:

```sql
DELETE FROM DownloadJobs WHERE Id = '<guid>';
```

Then restart the backend process so the in-memory slot cache is cleared.

## How to clean up orphaned *.partial files

If a job was hard-killed (SIGKILL, OOM) while `State = Downloading`, the `.partial` file may remain on disk indefinitely.

```bash
ls "$HOME/Library/Application Support/Mozgoslav/Models/"*.partial
rm "$HOME/Library/Application Support/Mozgoslav/Models/"*.partial
```

After cleaning, update the corresponding `DownloadJob` to `Cancelled` so the UI stops showing it:

```sql
UPDATE DownloadJobs SET State = 'Cancelled', FinishedAt = datetime('now')
WHERE State IN ('Downloading', 'Finalizing') AND Id = '<guid>';
```

## How to raise the concurrency limit

The default is 2 parallel downloads. Override in `appsettings.json` (or `appsettings.Development.json`):

```json
{
  "Mozgoslav": {
    "Downloads": {
      "MaxConcurrentDownloads": 4,
      "MaxRetries": 5
    }
  }
}
```

Restart the backend process after changing the setting. The semaphore is initialized at startup and cannot be resized at runtime.
