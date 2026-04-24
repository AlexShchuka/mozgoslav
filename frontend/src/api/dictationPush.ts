const BACKEND_URL = "http://localhost:5050";

export const pushDictationAudio = (sessionId: string, audioBuffer: ArrayBuffer): Promise<void> =>
  fetch(`${BACKEND_URL}/api/dictation/${sessionId}/push`, {
    method: "POST",
    body: audioBuffer,
    headers: { "Content-Type": "application/octet-stream" },
  }).then(() => undefined);
