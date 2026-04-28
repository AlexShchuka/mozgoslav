export interface SystemActionTemplate {
  readonly name: string;
  readonly description: string;
  readonly deeplinkUrl: string;
}

export interface SystemActionsState {
  readonly templates: SystemActionTemplate[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

export const initialSystemActionsState: SystemActionsState = {
  templates: [],
  isLoading: false,
  error: null,
};
