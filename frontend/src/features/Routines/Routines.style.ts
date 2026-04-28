import styled from "styled-components";

export const RoutinesRoot = styled.section`
  padding: ${({ theme }) => theme.space(6)};
`;

export const PageTitle = styled.h2`
  margin: 0 0 ${({ theme }) => theme.space(6)} 0;
  font-size: ${({ theme }) => theme.font.size.xl};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.01em;
`;

export const RoutineCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space(5)};
  margin-bottom: ${({ theme }) => theme.space(4)};
  background: ${({ theme }) => theme.colors.bg.elevated1};
`;

export const RoutineHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(4)};
`;

export const RoutineInfo = styled.div`
  flex: 1;
`;

export const RoutineName = styled.h3`
  margin: 0 0 ${({ theme }) => theme.space(1)} 0;
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const RoutineDescription = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`;

export const RoutineActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
`;

export const LastRunInfo = styled.div`
  margin-top: ${({ theme }) => theme.space(3)};
  padding-top: ${({ theme }) => theme.space(3)};
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`;

export const StatusBadge = styled.span<{ $status: string }>`
  display: inline-block;
  padding: ${({ theme }) => `${theme.space(1)} ${theme.space(2)}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  background: ${({ $status, theme }) =>
    $status === "Succeeded"
      ? theme.colors.successSoft
      : $status === "Failed"
        ? theme.colors.errorSoft
        : theme.colors.accent.soft};
  color: ${({ $status, theme }) =>
    $status === "Succeeded"
      ? theme.colors.success
      : $status === "Failed"
        ? theme.colors.error
        : theme.colors.accent.primary};
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

export const CronSlotCard = styled.div`
  border: 1px dashed ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space(5)};
  opacity: 0.5;
`;
