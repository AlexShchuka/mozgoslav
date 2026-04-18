import { darkTheme, lightTheme } from "../../src/styles/theme";

// ADR-013 — lock the top-level shape of both themes. Any future drift (new
// flat key, missing nested group) breaks the build loudly instead of silently
// landing in a feature PR.
describe("theme — ADR-013 nested shape snapshot", () => {
  it("darkTheme.colors exposes the ADR-013 token groups", () => {
    expect(Object.keys(darkTheme.colors).sort()).toEqual([
      "accent",
      "bg",
      "border",
      "error",
      "focusRing",
      "info",
      "success",
      "text",
      "warning",
    ]);
  });

  it("darkTheme.colors.bg has all four elevation layers", () => {
    expect(Object.keys(darkTheme.colors.bg).sort()).toEqual([
      "base",
      "elevated1",
      "elevated2",
      "elevated3",
    ]);
  });

  it("darkTheme.colors.accent has primary/secondary/soft/contrast/glow", () => {
    expect(Object.keys(darkTheme.colors.accent).sort()).toEqual([
      "contrast",
      "glow",
      "primary",
      "secondary",
      "soft",
    ]);
  });

  it("darkTheme.colors.text has primary/secondary/muted", () => {
    expect(Object.keys(darkTheme.colors.text).sort()).toEqual([
      "muted",
      "primary",
      "secondary",
    ]);
  });

  it("darkTheme.colors.border has subtle/strong", () => {
    expect(Object.keys(darkTheme.colors.border).sort()).toEqual([
      "strong",
      "subtle",
    ]);
  });

  it("shadow exposes xs/sm/md/lg/accent", () => {
    expect(Object.keys(darkTheme.shadow).sort()).toEqual([
      "accent",
      "lg",
      "md",
      "sm",
      "xs",
    ]);
  });

  it("motion exposes duration + easing nested groups", () => {
    expect(Object.keys(darkTheme.motion).sort()).toEqual(["duration", "easing"]);
    expect(Object.keys(darkTheme.motion.duration).sort()).toEqual([
      "base",
      "fast",
      "instant",
      "slow",
    ]);
    expect(Object.keys(darkTheme.motion.easing).sort()).toEqual([
      "emphasized",
      "spring",
      "standard",
    ]);
    expect(Object.keys(darkTheme.motion.easing.spring).sort()).toEqual([
      "firm",
      "soft",
    ]);
  });

  it("lightTheme mirrors the same shape as darkTheme", () => {
    expect(Object.keys(lightTheme.colors).sort()).toEqual(
      Object.keys(darkTheme.colors).sort(),
    );
    expect(Object.keys(lightTheme.colors.bg).sort()).toEqual(
      Object.keys(darkTheme.colors.bg).sort(),
    );
    expect(Object.keys(lightTheme.colors.accent).sort()).toEqual(
      Object.keys(darkTheme.colors.accent).sort(),
    );
    expect(Object.keys(lightTheme.shadow).sort()).toEqual(
      Object.keys(darkTheme.shadow).sort(),
    );
    expect(Object.keys(lightTheme.motion.duration).sort()).toEqual(
      Object.keys(darkTheme.motion.duration).sort(),
    );
  });

  it("accent.primary matches ADR-013 dark palette (#29fcc3)", () => {
    expect(darkTheme.colors.accent.primary.toLowerCase()).toBe("#29fcc3");
  });

  it("accent.primary on light uses deeper cyan for readability (#0bd4cd)", () => {
    expect(lightTheme.colors.accent.primary.toLowerCase()).toBe("#0bd4cd");
  });
});
