import { type FC, useState } from "react";
import { useTranslation } from "react-i18next";

import Button from "../../components/Button";
import Input from "../../components/Input";
import type { PromptTemplate } from "../../domain/prompts";
import {
  FieldGroup,
  FieldLabel,
  FieldTextarea,
  Modal,
  ModalBackdrop,
  ModalFooter,
  ModalTitle,
} from "./Prompts.style";

interface PromptEditorProps {
  template?: PromptTemplate | null;
  onSave: (name: string, body: string) => void;
  onClose: () => void;
}

const PromptEditor: FC<PromptEditorProps> = ({ template, onSave, onClose }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(template?.name ?? "");
  const [body, setBody] = useState(template?.body ?? "");

  const handleSave = () => {
    if (name.trim() && body.trim()) {
      onSave(name.trim(), body.trim());
    }
  };

  return (
    <ModalBackdrop
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <Modal>
        <ModalTitle>
          {template ? t("prompts.editor.editTitle") : t("prompts.editor.createTitle")}
        </ModalTitle>
        <FieldGroup>
          <FieldLabel htmlFor="prompt-name">{t("prompts.editor.name")}</FieldLabel>
          <Input
            id="prompt-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("prompts.editor.namePlaceholder")}
            data-testid="prompt-name-input"
          />
        </FieldGroup>
        <FieldGroup>
          <FieldLabel htmlFor="prompt-body">{t("prompts.editor.body")}</FieldLabel>
          <FieldTextarea
            id="prompt-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("prompts.editor.bodyPlaceholder")}
            data-testid="prompt-body-textarea"
          />
        </FieldGroup>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!name.trim() || !body.trim()}
            data-testid="prompt-save-btn"
          >
            {t("common.save")}
          </Button>
        </ModalFooter>
      </Modal>
    </ModalBackdrop>
  );
};

export default PromptEditor;
