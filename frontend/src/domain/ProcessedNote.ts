import type {ActionItem} from "./ActionItem";
import type {ConversationType} from "./enums";

export interface ProcessedNote {
    id: string;
    transcriptId: string;
    profileId: string;
    version: number;
    summary: string;
    keyPoints: string[];
    decisions: string[];
    actionItems: ActionItem[];
    unresolvedQuestions: string[];
    participants: string[];
    topic: string;
    conversationType: ConversationType;
    cleanTranscript: string;
    fullTranscript: string;
    tags: string[];
    markdownContent: string;
    exportedToVault: boolean;
    vaultPath: string | null;
    createdAt: string;
}
