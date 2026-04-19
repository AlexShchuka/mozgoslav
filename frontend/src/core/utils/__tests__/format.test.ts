import {formatDuration} from "../format";

describe("formatDuration (task #18 pending-duration placeholder)", () => {
    it("returns '—' for zero duration strings so un-probed recordings don't lie about being 0:00", () => {
        expect(formatDuration("00:00:00")).toBe("—");
        expect(formatDuration("0:00:00")).toBe("—");
        expect(formatDuration("0")).toBe("—");
        expect(formatDuration("")).toBe("—");
    });

    it("returns '—' for undefined / null-ish inputs", () => {
        expect(formatDuration(undefined as unknown as string)).toBe("—");
        expect(formatDuration(null as unknown as string)).toBe("—");
    });

    it("formats ISO-8601-like hh:mm:ss correctly", () => {
        expect(formatDuration("00:00:30")).toBe("0:30");
        expect(formatDuration("00:01:05")).toBe("1:05");
        expect(formatDuration("01:30:00")).toBe("1:30:00");
    });

    it("formats raw numeric seconds correctly", () => {
        expect(formatDuration("45")).toBe("0:45");
        expect(formatDuration("125")).toBe("2:05");
        expect(formatDuration("3725")).toBe("1:02:05");
    });

    it("returns the input when unparseable so we don't silently mask real garbage", () => {
        expect(formatDuration("not-a-duration")).toBe("not-a-duration");
    });
});
