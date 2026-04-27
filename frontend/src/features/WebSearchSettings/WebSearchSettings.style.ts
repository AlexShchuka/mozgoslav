import styled from "styled-components";

export const SectionTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.space(3)};
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const EngineRow = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
`;

export const EngineGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(3)};
  margin-bottom: ${({ theme }) => theme.space(5)};
`;

export const SliderRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  margin-bottom: ${({ theme }) => theme.space(5)};
`;

export const SliderLabel = styled.label`
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  min-width: 180px;
`;

export const SliderValue = styled.span`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 40px;
`;

export const RawYamlPre = styled.pre`
  background: ${({ theme }) => theme.colors.bg.elevated2};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.space(3)};
  font-family: ${({ theme }) => theme.font.familyMono};
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: auto;
  max-height: 200px;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0 0 ${({ theme }) => theme.space(4)};
`;

export const PrivacyDisclaimer = styled.p`
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0 0 ${({ theme }) => theme.space(4)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  background: ${({ theme }) => theme.colors.bg.elevated2};
  border-left: 3px solid ${({ theme }) => theme.colors.accent.primary};
  border-radius: 0 ${({ theme }) => theme.radii.sm} ${({ theme }) => theme.radii.sm} 0;
`;

export const Toolbar = styled.div`
  display: flex;
  justify-content: flex-end;
`;
