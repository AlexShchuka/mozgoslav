import { type FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";

import Button from "../../components/Button";
import type { PromptTemplate } from "../../domain/prompts";
import PromptEditor from "./PromptEditor";
import PromptTestRunner from "./PromptTestRunner";
import type { PromptsProps } from "./types";
import {
  EmptyState,
  ErrorText,
  PageHeader,
  PageTitle,
  PromptsRoot,
  TemplateActions,
  TemplateBody,
  TemplateCard,
  TemplateHeader,
  TemplateName,
} from "./Prompts.style";

const Prompts: FC<PromptsProps> = ({
  templates,
  isLoading,
  error,
  previewResult,
  isPreviewLoading,
  deletingIds,
  onLoad,
  onCreate,
  onUpdate,
  onDelete,
  onPreview,
  onPreviewClear,
}) => {
  const { t } = useTranslation();
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null | undefined>(
    undefined
  );

  useEffect(() => {
    onLoad();
  }, [onLoad]);

  const handleSave = (name: string, body: string) => {
    if (editingTemplate) {
      onUpdate(editingTemplate.id, name, body);
    } else {
      onCreate(name, body);
    }
    setEditingTemplate(undefined);
  };

  return (
    <PromptsRoot>
      <PageHeader>
        <PageTitle>{t("prompts.title")}</PageTitle>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus size={14} />}
          onClick={() => setEditingTemplate(null)}
          data-testid="prompt-create-btn"
        >
          {t("prompts.create")}
        </Button>
      </PageHeader>

      {error && <ErrorText data-testid="prompts-error">{error}</ErrorText>}

      {templates.length === 0 && !isLoading ? (
        <EmptyState data-testid="prompts-empty">{t("prompts.empty")}</EmptyState>
      ) : (
        templates.map((template) => (
          <TemplateCard key={template.id} data-testid={`prompt-card-${template.id}`}>
            <TemplateHeader>
              <TemplateName>{template.name}</TemplateName>
              <TemplateActions>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTemplate(template)}
                  data-testid={`prompt-edit-${template.id}`}
                >
                  {t("common.edit")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deletingIds[template.id] === true}
                  onClick={() => onDelete(template.id)}
                  data-testid={`prompt-delete-${template.id}`}
                >
                  {t("common.delete")}
                </Button>
              </TemplateActions>
            </TemplateHeader>
            <TemplateBody>{template.body}</TemplateBody>
          </TemplateCard>
        ))
      )}

      <PromptTestRunner
        previewResult={previewResult}
        isLoading={isPreviewLoading}
        onPreview={onPreview}
        onClear={onPreviewClear}
      />

      {editingTemplate !== undefined && (
        <PromptEditor
          template={editingTemplate}
          onSave={handleSave}
          onClose={() => setEditingTemplate(undefined)}
        />
      )}
    </PromptsRoot>
  );
};

export default Prompts;
