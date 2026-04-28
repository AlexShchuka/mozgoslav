import styled from "styled-components";

export const PromptsRoot = styled.section`
  padding: ${({ theme }) => theme.space(6)};
`;

export const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.space(6)};
`;

export const PageTitle = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.xl};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.01em;
`;

export const TemplateCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space(5)};
  margin-bottom: ${({ theme }) => theme.space(4)};
  background: ${({ theme }) => theme.colors.bg.elevated1};
`;

export const TemplateHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(4)};
  margin-bottom: ${({ theme }) => theme.space(3)};
`;

export const TemplateName = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const TemplateActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space(2)};
`;

export const TemplateBody = styled.pre`
  margin: 0;
  padding: ${({ theme }) => theme.space(3)};
  background: ${({ theme }) => theme.colors.bg.elevated2};
  border-radius: ${({ theme }) => theme.radii.md};
  font-family: ${({ theme }) => theme.font.familyMono};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 120px;
  overflow: auto;
`;

export const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.colors.overlayBackdrop};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

export const Modal = styled.div`
  background: ${({ theme }) => theme.colors.bg.elevated1};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space(6)};
  width: 600px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: auto;
  box-shadow: ${({ theme }) => theme.shadow.lg};
`;

export const ModalTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.space(5)} 0;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const FieldLabel = styled.label`
  display: block;
  margin-bottom: ${({ theme }) => theme.space(2)};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const FieldInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => `${theme.space(2)} ${theme.space(3)}`};
  background: ${({ theme }) => theme.colors.bg.elevated2};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: ${({ theme }) => theme.font.family};
  font-size: ${({ theme }) => theme.font.size.sm};
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

export const FieldTextarea = styled.textarea`
  width: 100%;
  padding: ${({ theme }) => `${theme.space(2)} ${theme.space(3)}`};
  background: ${({ theme }) => theme.colors.bg.elevated2};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: ${({ theme }) => theme.font.familyMono};
  font-size: ${({ theme }) => theme.font.size.sm};
  resize: vertical;
  min-height: 160px;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

export const FieldGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.space(4)};
`;

export const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space(3)};
  margin-top: ${({ theme }) => theme.space(5)};
`;

export const PreviewPanel = styled.div`
  margin-top: ${({ theme }) => theme.space(4)};
  padding: ${({ theme }) => theme.space(4)};
  background: ${({ theme }) => theme.colors.bg.elevated2};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

export const PreviewOutput = styled.pre`
  margin: ${({ theme }) => theme.space(3)} 0 0 0;
  font-family: ${({ theme }) => theme.font.familyMono};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: pre-wrap;
  word-break: break-word;
`;

export const PreviewTitle = styled.div`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.space(2)};
`;

export const EmptyState = styled.div`
  padding: ${({ theme }) => theme.space(10)};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
  border: 1px dashed ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
`;

export const ErrorText = styled.div`
  color: ${({ theme }) => theme.colors.error};
  margin-bottom: ${({ theme }) => theme.space(3)};
`;

export const PreviewRunnerFooter = styled.div`
  margin-top: ${({ theme }) => theme.space(4)};
  display: flex;
  gap: ${({ theme }) => theme.space(2)};
`;

export const PreviewOutputTitle = styled.div`
  margin-top: ${({ theme }) => theme.space(4)};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.space(2)};
`;
