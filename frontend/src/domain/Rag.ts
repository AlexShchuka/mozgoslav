export interface RagCitation {
  noteId: string;
  chunkId: string;
  text: string;
  score: number;
}

export interface RagAnswer {
  answer: string;
  llmAvailable: boolean;
  citations: RagCitation[];
}
