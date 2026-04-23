const PENDING_PLACEHOLDER = "—";

export const formatDuration = (raw: string): string => {
    if (!raw) {
        return PENDING_PLACEHOLDER;
    }

    const asNumber = Number(raw);
    if (!Number.isNaN(asNumber)) {
        const seconds = Math.max(0, Math.round(asNumber));
        return seconds === 0 ? PENDING_PLACEHOLDER : secondsToString(seconds);
    }

    const parts = raw.split(":").map((p) => Number(p));
    if (parts.length >= 2 && parts.every((n) => !Number.isNaN(n))) {
        const totalSeconds =
            parts.length === 3
                ? parts[0]! * 3600 + parts[1]! * 60 + parts[2]!
                : parts[0]! * 60 + parts[1]!;
        const seconds = Math.max(0, Math.round(totalSeconds));
        return seconds === 0 ? PENDING_PLACEHOLDER : secondsToString(seconds);
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
