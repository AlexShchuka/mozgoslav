import styled, { css, keyframes } from "styled-components";

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.colors.overlayBackdrop};
  z-index: 200;
`;

export const DrawerPanel = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 360px;
  background: ${({ theme }) => theme.colors.bg.elevated1};
  border-left: 1px solid ${({ theme }) => theme.colors.border.subtle};
  z-index: 201;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.space(4)};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

export const DrawerTitle = styled.h2`
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.space(1)};
  border-radius: ${({ theme }) => theme.radii.sm};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.bg.elevated2};
  }
`;

export const DrawerBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.space(3)};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
`;

const highlightPulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(var(--accent-rgb, 102, 178, 255), 0.5); }
  60% { box-shadow: 0 0 0 6px rgba(var(--accent-rgb, 102, 178, 255), 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--accent-rgb, 102, 178, 255), 0); }
`;

const finalizingPulse = keyframes`
  0% { opacity: 0.65; }
  50% { opacity: 1; }
  100% { opacity: 0.65; }
`;

export const DownloadItem = styled.div<{ $highlighted?: boolean; $finalizing?: boolean }>`
  padding: ${({ theme }) => theme.space(3)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg.elevated2};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};

  ${({ $highlighted, theme }) =>
    $highlighted &&
    css`
      border-color: ${theme.colors.accent.primary};
      animation: ${highlightPulse} 1.2s ease-out 1;
    `}

  ${({ $finalizing }) =>
    $finalizing &&
    css`
      animation: ${finalizingPulse} 1.4s ease-in-out infinite;
    `}
`;

export const DownloadItemHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(2)};
`;

export const DownloadItemName = styled.span`
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const DownloadItemMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const EmptyMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.space(8)};
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.font.size.sm};
`;
