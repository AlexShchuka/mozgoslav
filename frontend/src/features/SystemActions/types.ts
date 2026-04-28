export interface SystemActionTemplate {
  readonly name: string;
  readonly description: string;
  readonly deeplinkUrl: string;
}

export interface SystemActionsProps {
  readonly templates: SystemActionTemplate[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onLoad: () => void;
}
