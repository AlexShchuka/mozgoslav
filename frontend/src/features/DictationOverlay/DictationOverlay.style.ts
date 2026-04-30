import styled, { keyframes } from "styled-components";

export const OverlayRoot = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1.5)};
  padding: ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(2)};
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.colors.bg.elevated2};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadow.overlay};
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
      ? theme.colors.errorStrong
      : $phase === "processing"
        ? theme.colors.accent.primary
        : theme.colors.text.secondary};
`;

export const PartialText = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.md};
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const spin = keyframes`
    to {
        transform: rotate(360deg);
    }
`;

export const Spinner = styled.span`
  width: 16px;
  height: 16px;
  border-radius: ${({ theme }) => theme.radii.full};
  border: 2px solid ${({ theme }) => theme.colors.border.subtle};
  border-top-color: ${({ theme }) => theme.colors.accent.primary};
  animation: ${spin} 0.8s linear infinite;
  flex-shrink: 0;
`;

export const CancelButton = styled.button`
  flex-shrink: 0;
  padding: ${({ theme }) => theme.space(0.5)} ${({ theme }) => theme.space(1.5)};
  border: 1px solid ${({ theme }) => theme.colors.error};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: transparent;
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.font.size.xs};
  font-family: ${({ theme }) => theme.font.family};
  cursor: pointer;
  line-height: 1;

  &:hover {
    background: ${({ theme }) => theme.colors.errorSoft};
  }
`;
