import type { AppSettings } from "../../domain/Settings";
import type {
  ObsidianApplyLayoutReport,
  ObsidianBulkExportReport,
  ObsidianSetupReport,
} from "../../store/slices/obsidian/types";

export interface ObsidianStateProps {
  readonly settings: AppSettings | null;
  readonly isBulkExporting: boolean;
  readonly isApplyingLayout: boolean;
  readonly isSetupInProgress: boolean;
  readonly lastBulkExportReport: ObsidianBulkExportReport | null;
  readonly lastApplyLayoutReport: ObsidianApplyLayoutReport | null;
  readonly lastSetupReport: ObsidianSetupReport | null;
  readonly error: string | null;
}

export interface ObsidianDispatchProps {
  readonly onLoadSettings: () => void;
  readonly onSaveSettings: (settings: AppSettings) => void;
  readonly onSetup: (vaultPath?: string) => void;
  readonly onBulkExport: () => void;
  readonly onApplyLayout: () => void;
}

export type ObsidianProps = ObsidianStateProps & ObsidianDispatchProps;
