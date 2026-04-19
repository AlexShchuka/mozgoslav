export type SyncView = "devices" | "folders" | "conflicts" | "settings";

export interface SyncConflictFile {
    readonly folderId: string;
    readonly path: string;
    readonly conflictPath: string;
}
