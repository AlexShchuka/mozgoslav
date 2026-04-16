/**
 * Formats a duration string returned by the backend (expected ISO 8601 "hh:mm:ss"
 * or total-seconds number as string) into a human-readable `M:SS` / `H:MM:SS` form.
 * Returns the original input if it cannot be parsed.
 */
export const formatDuration = (raw: string): string => {
  if (!raw) {
    return "0:00";
  }

  const asNumber = Number(raw);
  if (!Number.isNaN(asNumber)) {
    return secondsToString(Math.max(0, Math.round(asNumber)));
  }

  const parts = raw.split(":").map((p) => Number(p));
  if (parts.length >= 2 && parts.every((n) => !Number.isNaN(n))) {
    const totalSeconds =
      parts.length === 3
        ? parts[0]! * 3600 + parts[1]! * 60 + parts[2]!
        : parts[0]! * 60 + parts[1]!;
    return secondsToString(Math.max(0, Math.round(totalSeconds)));
  }

  return raw;
};

const secondsToString = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number): string => n.toString().padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
};
