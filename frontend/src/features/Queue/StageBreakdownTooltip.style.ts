import styled from "styled-components";

export const TooltipRoot = styled.div`
  position: absolute;
  bottom: calc(100% + ${({ theme }) => theme.space(2)});
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.colors.bg.elevated2};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.space(3)};
  z-index: 100;
  min-width: 220px;
`;

export const TooltipTitle = styled.div`
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.space(2)};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

export const StageRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => `${theme.space(1)} 0`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};

  &:last-child {
    border-bottom: 0;
  }
`;

export const StageName = styled.span`
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  flex: 1;
`;

export const StageDuration = styled.span`
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  white-space: nowrap;
`;

export const StageError = styled.div`
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.error};
  margin-top: ${({ theme }) => theme.space(0.5)};
`;

export const ProgressBarWrapper = styled.div`
  position: relative;
  cursor: pointer;
`;
