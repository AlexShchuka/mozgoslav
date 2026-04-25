import styled, { keyframes } from "styled-components";

const pulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

export const LiveTranscriptRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  margin-top: ${({ theme }) => theme.space(2)};
  border-left: 3px solid ${({ theme }) => theme.colors.accent.primary};
  background: ${({ theme }) => theme.colors.accent.soft};
  border-radius: ${({ theme }) => theme.radii.sm};
`;

export const LiveTranscriptHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.accent.primary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

export const LiveTranscriptDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.colors.accent.primary};
  animation: ${pulse} 1.4s ease-in-out infinite;
`;

export const LiveTranscriptText = styled.div`
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;
