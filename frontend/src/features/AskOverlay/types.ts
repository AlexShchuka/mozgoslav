export interface AskOverlayProps {
  question: string;
  answer: string;
  error: string | null;
  isLoading: boolean;
  onHide: () => void;
}
