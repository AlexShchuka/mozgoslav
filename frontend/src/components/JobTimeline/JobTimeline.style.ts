import styled, { css } from "styled-components";

export type StageState = "done" | "failed" | "paused" | "pending" | "running" | "skipped";

const stateStyles: Record<StageState, ReturnType<typeof css>> = {
  done: css`
    color: ${({ theme }) => theme.colors.success};
    background: ${({ theme }) => theme.colors.successSoft};
    border-color: ${({ theme }) => theme.colors.success};
  `,
  failed: css`
    color: ${({ theme }) => theme.colors.error};
    background: ${({ theme }) => theme.colors.errorSoft};
    border-color: ${({ theme }) => theme.colors.error};
  `,
  paused: css`
    color: ${({ theme }) => theme.colors.warning};
    background: ${({ theme }) => theme.colors.warningSoft};
    border-color: ${({ theme }) => theme.colors.warningBorder};
  `,
  pending: css`
    color: ${({ theme }) => theme.colors.text.muted};
    background: transparent;
    border-color: ${({ theme }) => theme.colors.border.subtle};
  `,
  running: css`
    color: ${({ theme }) => theme.colors.accent.primary};
    background: ${({ theme }) => theme.colors.accent.soft};
    border-color: ${({ theme }) => theme.colors.accent.primary};
  `,
  skipped: css`
    color: ${({ theme }) => theme.colors.text.muted};
    background: ${({ theme }) => theme.colors.bg.elevated2};
    border-color: ${({ theme }) => theme.colors.border.subtle};
    text-decoration: line-through;
  `,
};

export const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(3)} 0;
`;

export const StagesRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1)};
  flex-wrap: wrap;
`;

export const Connector = styled.div`
  width: ${({ theme }) => theme.space(3)};
  height: 1px;
  background: ${({ theme }) => theme.colors.border.subtle};
  flex-shrink: 0;
`;

export const StageChip = styled.div<{ $state: StageState }>`
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ theme }) => `${theme.space(1.5)} ${theme.space(2.5)}`};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid;
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  cursor: default;
  transition:
    background ${({ theme }) => theme.motion.duration.fast},
    color ${({ theme }) => theme.motion.duration.fast},
    border-color ${({ theme }) => theme.motion.duration.fast};

  ${({ $state }) => stateStyles[$state]}
`;

export const StageIcon = styled.span`
  font-size: 11px;
  line-height: 1;
  margin-bottom: 2px;
`;

export const StageName = styled.span`
  white-space: nowrap;
`;

export const StageActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space(1)};
  margin-top: ${({ theme }) => theme.space(1)};
`;

export const Tooltip = styled.div`
  position: absolute;
  bottom: calc(100% + ${({ theme }) => theme.space(1.5)});
  left: 50%;
  transform: translateX(-50%);
  background: ${({ theme }) => theme.colors.bg.elevated3};
  border: 1px solid ${({ theme }) => theme.colors.border.strong};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: ${({ theme }) => `${theme.space(1.5)} ${theme.space(2)}`};
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  z-index: 10;
  box-shadow: ${({ theme }) => theme.shadow.sm};
`;

export const JobControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding-top: ${({ theme }) => theme.space(1)};
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;
