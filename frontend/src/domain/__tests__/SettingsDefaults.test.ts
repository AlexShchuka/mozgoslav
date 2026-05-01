import { DEFAULT_SETTINGS } from "../Settings";

describe("DEFAULT_SETTINGS critical fields sync to backend AppSettingsDto.Defaults", () => {
  it("dictationEnabled matches backend Defaults (backend: AppSettingsDto.cs DictationEnabled = true)", () => {
    expect(DEFAULT_SETTINGS.dictationEnabled).toBe(true);
  });

  it("dictationMouseButton matches backend Defaults (backend: AppSettingsDto.cs DictationMouseButton = 5)", () => {
    expect(DEFAULT_SETTINGS.dictationMouseButton).toBe(5);
  });

  it("dictationCaptureSampleRate matches backend Defaults (backend: AppSettingsDto.cs DictationCaptureSampleRate = 48000)", () => {
    expect(DEFAULT_SETTINGS.dictationCaptureSampleRate).toBe(48000);
  });

  it("whisperThreads matches backend Defaults (backend: AppSettingsDto.cs WhisperThreads = 0)", () => {
    expect(DEFAULT_SETTINGS.whisperThreads).toBe(0);
  });
});
