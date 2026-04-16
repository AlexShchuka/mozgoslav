import styled, { keyframes } from "styled-components";

export const OverlayRoot = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  padding: ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(2)};
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  box-sizing: border-box;
`;

export const Waveform = styled.canvas`
  width: 72px;
  height: 48px;
  flex-shrink: 0;
`;

export const TextColumn = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${({ theme }) => theme.space(0.5)};
`;

export const PhaseLabel = styled.span<{ $phase: string }>`
  font-size: ${({ theme }) => theme.font.size.xs};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme, $phase }) =>
    $phase === "recording"
      ? "#d94848"
      : $phase === "processing"
        ? theme.colors.accent
        : theme.colors.textMuted};
`;

export const PartialText = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.md};
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const Spinner = styled.span`
  width: 16px;
  height: 16px;
  border-radius: ${({ theme }) => theme.radii.full};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.accent};
  animation: ${spin} 0.8s linear infinite;
  flex-shrink: 0;
`;
