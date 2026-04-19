import styled from "styled-components";

export const DashboardRoot = styled.div`
  padding: ${({theme}) => theme.space(6)};
  display: flex;
  flex-direction: column;
  gap: ${({theme}) => theme.space(5)};
`;

export const DropzoneRoot = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({theme}) => theme.space(4)};
  padding: ${({theme}) => theme.space(6)};
  border: 2px dashed ${({theme, $active}) => ($active ? theme.colors.accent.primary : theme.colors.border.subtle)};
  border-radius: ${({theme}) => theme.radii.lg};
  background: ${({theme, $active}) => ($active ? theme.colors.accent.soft : theme.colors.bg.base)};
  cursor: pointer;
  transition: border-color ${({theme}) => theme.motion.duration.fast},
    background ${({theme}) => theme.motion.duration.fast};

  &:hover {
    border-color: ${({theme}) => theme.colors.accent.primary};
    background: ${({theme}) => theme.colors.accent.soft};
  }
`;

export const DropzoneIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: ${({theme}) => theme.radii.full};
  background: ${({theme}) => theme.colors.bg.elevated2};
  color: ${({theme}) => theme.colors.accent.primary};
`;

export const DropzoneCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({theme}) => theme.space(1)};
`;

export const DropzoneTitle = styled.span`
  font-size: ${({theme}) => theme.font.size.md};
  font-weight: ${({theme}) => theme.font.weight.semibold};
  color: ${({theme}) => theme.colors.text.primary};
`;

export const DropzoneHint = styled.span`
  font-size: ${({theme}) => theme.font.size.sm};
  color: ${({theme}) => theme.colors.text.secondary};
`;

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({theme}) => theme.space(4)}; /* Bug 18 — bump from 2 to 4 so
     the Add / Record buttons breathe and do not abut the dropzone edge. */
  margin-top: ${({theme}) => theme.space(4)};
`;

export const DashboardTopBar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({theme}) => theme.space(4)};
  padding: 0 ${({theme}) => theme.space(1)};
`;

export const SectionTitle = styled.h2`
  margin: 0;
  font-size: ${({theme}) => theme.font.size.xl};
  font-weight: ${({theme}) => theme.font.weight.semibold};
  color: ${({theme}) => theme.colors.text.primary};
`;

export const RecordingRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({theme}) => theme.space(3)};
  padding: ${({theme}) => theme.space(3)} 0;
  color: ${({theme}) => theme.colors.text.primary};
  border-bottom: 1px solid ${({theme}) => theme.colors.border.subtle};
  &:last-child {
    border-bottom: 0;
  }
`;

export const RecordingMeta = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${({theme}) => theme.space(0.5)};
  color: ${({theme}) => theme.colors.text.secondary};

  small {
    font-size: ${({theme}) => theme.font.size.xs};
  }
`;

export const RecordingName = styled.span`
  font-size: ${({theme}) => theme.font.size.md};
  color: ${({theme}) => theme.colors.text.primary};
`;
