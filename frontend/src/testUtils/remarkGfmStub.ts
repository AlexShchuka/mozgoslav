// Lightweight remark-gfm replacement for Jest. The real package is ESM-only
// and ts-jest can't parse it; tests that mount NoteViewer don't exercise GFM
// features so a no-op plugin is sufficient.
const remarkGfmStub = (): void => {};
export default remarkGfmStub;
