import styled from "styled-components";

export const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({theme}) => theme.space(4)};
`;

export const QrBox = styled.div`
  display: flex;
  gap: ${({theme}) => theme.space(4)};
  align-items: center;

  @media (max-width: 720px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

export const QrFrame = styled.div`
  padding: ${({theme}) => theme.space(3)};
  background: #ffffff;
  border-radius: ${({theme}) => theme.radii.md};
  border: 1px solid ${({theme}) => theme.colors.border.subtle};
  line-height: 0;
`;

export const QrMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({theme}) => theme.space(2)};
  flex: 1;
`;

export const DeviceId = styled.code`
  display: inline-block;
  padding: ${({theme}) => `${theme.space(1)} ${theme.space(2)}`};
  background: ${({theme}) => theme.colors.bg.elevated2};
  border: 1px solid ${({theme}) => theme.colors.border.subtle};
  border-radius: ${({theme}) => theme.radii.sm};
  font-size: ${({theme}) => theme.font.size.sm};
  word-break: break-all;
`;

export const FolderList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: ${({theme}) => theme.space(1.5)};
`;

export const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: ${({theme}) => theme.space(3)};
`;

export const StatusRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: ${({theme}) => theme.space(2)};
  padding: ${({theme}) => theme.space(1)} 0;
  border-bottom: 1px dashed ${({theme}) => theme.colors.border.subtle};
  font-size: ${({theme}) => theme.font.size.sm};

  &:last-child {
    border-bottom: 0;
  }
`;

export const PendingItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({theme}) => theme.space(2)};
  padding: ${({theme}) => theme.space(2)} 0;
  border-bottom: 1px dashed ${({theme}) => theme.colors.border.subtle};

  &:last-child {
    border-bottom: 0;
  }
`;

export const ErrorBanner = styled.div`
  padding: ${({theme}) => `${theme.space(2)} ${theme.space(3)}`};
  background: ${({theme}) => theme.colors.bg.elevated2};
  color: ${({theme}) => theme.colors.error};
  border: 1px solid ${({theme}) => theme.colors.error};
  border-radius: ${({theme}) => theme.radii.sm};
  font-size: ${({theme}) => theme.font.size.sm};
`;
