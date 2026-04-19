import {darkTheme, lightTheme} from "../../src/styles/theme";

describe("theme — typography floor", () => {
    it("sm body text is at least 14 px", () => {
        const size = parseInt(lightTheme.font.size.sm, 10);
        expect(size).toBeGreaterThanOrEqual(14);
        expect(size).toBe(parseInt(darkTheme.font.size.sm, 10));
    });

    it("md body text is at least 14 px", () => {
        expect(parseInt(lightTheme.font.size.md, 10)).toBeGreaterThanOrEqual(14);
    });

    it("regular weight is at least 500 (primary buttons never drop below it)", () => {
        expect(lightTheme.font.weight.regular).toBeGreaterThanOrEqual(500);
        expect(darkTheme.font.weight.regular).toBeGreaterThanOrEqual(500);
    });

    it("medium weight is at least 500 for Button primary variant", () => {
        expect(lightTheme.font.weight.medium).toBeGreaterThanOrEqual(500);
    });
});
