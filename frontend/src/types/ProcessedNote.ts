export type ConversationType = "Meeting" | "Dictation" | "Interview" | "Call" | "Other";

export interface ActionItem {
  person: string;
  task: string;
  deadline: string | null;
}

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
