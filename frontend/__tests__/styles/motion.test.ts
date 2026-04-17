import {
  buttonVariants,
  cardVariants,
  dictationOverlayVariants,
  onboardingStepVariants,
  pageTransitionVariants,
  progressBarVariants,
  sidebarItemVariants,
  toastVariants,
} from "../../src/styles/motion";

// ADR-013 — surface contract: each exported variant set exposes the motion
// states the components rely on. We assert the KEYS, not the numeric values,
// so the spring/ease tuning can be tweaked without breaking the test.
describe("motion variants — ADR-013 catalogue", () => {
  it("buttonVariants exposes idle/hover/tap/loading", () => {
    expect(Object.keys(buttonVariants).sort()).toEqual([
      "hover",
      "idle",
      "loading",
      "tap",
    ]);
  });

  it("cardVariants exposes hidden/show/hover/tap", () => {
    expect(Object.keys(cardVariants).sort()).toEqual([
      "hidden",
      "hover",
      "show",
      "tap",
    ]);
  });

  it("sidebarItemVariants exposes inactive/hover/active", () => {
    expect(Object.keys(sidebarItemVariants).sort()).toEqual([
      "active",
      "hover",
      "inactive",
    ]);
  });

  it("progressBarVariants exposes idle/active/complete", () => {
    expect(Object.keys(progressBarVariants).sort()).toEqual([
      "active",
      "complete",
      "idle",
    ]);
  });

  it("toastVariants exposes initial/enter/exit", () => {
    expect(Object.keys(toastVariants).sort()).toEqual(["enter", "exit", "initial"]);
  });

  it("dictationOverlayVariants exposes initial/enter/recording/exit", () => {
    expect(Object.keys(dictationOverlayVariants).sort()).toEqual([
      "enter",
      "exit",
      "initial",
      "recording",
    ]);
  });

  it("onboardingStepVariants exposes enter/center/exit", () => {
    expect(Object.keys(onboardingStepVariants).sort()).toEqual([
      "center",
      "enter",
      "exit",
    ]);
  });

  it("pageTransitionVariants exposes initial/enter/exit", () => {
    expect(Object.keys(pageTransitionVariants).sort()).toEqual([
      "enter",
      "exit",
      "initial",
    ]);
  });
});
