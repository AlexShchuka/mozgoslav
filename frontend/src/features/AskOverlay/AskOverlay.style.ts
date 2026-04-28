import styled from "styled-components";

export const AskOverlayRoot = styled.section`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${({ theme }) => theme.colors.bg.elevated1};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadow.lg};
  overflow: hidden;
`;

export const OverlayHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.space(3)} ${theme.space(4)}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

export const OverlayTitle = styled.span`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.font.size.lg};
  line-height: 1;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

export const OverlayBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => `${theme.space(3)} ${theme.space(4)}`};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.6;
`;

export const QuestionText = styled.p`
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.accent.primary};
  margin: 0 0 ${({ theme }) => theme.space(2)};
`;

export const AnswerText = styled.p`
  margin: 0;
  white-space: pre-wrap;
`;

export const ErrorText = styled.p`
  color: ${({ theme }) => theme.colors.error};
  margin: 0;
`;

export const LoadingSpinner = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space(1)};
  align-items: center;
  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.text.muted};
    animation: spin 1.4s infinite both;
    &:nth-child(2) {
      animation-delay: 0.2s;
    }
    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }

  @keyframes spin {
    0%,
    80%,
    100% {
      opacity: 0.2;
    }
    40% {
      opacity: 1;
    }
  }
`;
