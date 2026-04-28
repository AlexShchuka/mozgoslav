import { type FC, useState } from "react";
import { useTranslation } from "react-i18next";

import Button from "../../components/Button";
import {
  FieldGroup,
  FieldLabel,
  FieldTextarea,
  PreviewOutput,
  PreviewOutputTitle,
  PreviewPanel,
  PreviewRunnerFooter,
} from "./Prompts.style";

interface PromptTestRunnerProps {
  previewResult: string | null;
  isLoading: boolean;
  onPreview: (templateBody: string) => void;
  onClear: () => void;
}

const PromptTestRunner: FC<PromptTestRunnerProps> = ({
  previewResult,
  isLoading,
  onPreview,
  onClear,
}) => {
  const { t } = useTranslation();
  const [body, setBody] = useState("");

  const handlePreview = () => {
    if (body.trim()) {
      onPreview(body.trim());
    }
  };

  return (
    <PreviewPanel>
      <FieldGroup>
        <FieldLabel htmlFor="test-runner-body">{t("prompts.testRunner.inputLabel")}</FieldLabel>
        <FieldTextarea
          id="test-runner-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("prompts.testRunner.placeholder")}
          data-testid="test-runner-body"
        />
      </FieldGroup>
      <Button
        variant="secondary"
        size="sm"
        disabled={isLoading || !body.trim()}
        onClick={handlePreview}
        data-testid="test-runner-submit"
      >
        {isLoading ? t("common.loading") : t("prompts.testRunner.run")}
      </Button>
      {previewResult !== null && (
        <>
          <PreviewOutputTitle>{t("prompts.testRunner.output")}</PreviewOutputTitle>
          <PreviewOutput data-testid="test-runner-output">{previewResult}</PreviewOutput>
          <PreviewRunnerFooter>
            <Button variant="ghost" size="sm" onClick={onClear}>
              {t("common.close")}
            </Button>
          </PreviewRunnerFooter>
        </>
      )}
    </PreviewPanel>
  );
};

export default PromptTestRunner;
