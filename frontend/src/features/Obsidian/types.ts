import type {AppSettings} from "../../domain/Settings";

export interface ObsidianStateProps {
    readonly settings: AppSettings | null;
    readonly isBulkExporting: boolean;
    readonly isApplyingLayout: boolean;
    readonly isSetupInProgress: boolean;
}

export interface ObsidianDispatchProps {
    readonly onLoadSettings: () => void;
    readonly onSaveSettings: (settings: AppSettings) => void;
    readonly onSetup: (vaultPath?: string) => void;
    readonly onBulkExport: () => void;
    readonly onApplyLayout: () => void;
}

export type ObsidianProps = ObsidianStateProps & ObsidianDispatchProps;
