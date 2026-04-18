import styled from "styled-components";

export const HomeListRoot = styled.section`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(3)};
  padding: 0 ${({ theme }) => theme.space(6)} ${({ theme }) => theme.space(6)};
`;

export const HomeListHeader = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const HomeListScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(3)};
  /* Padding-right reserves space for the scrollbar so rows don't jump when
     one appears. */
  padding-right: ${({ theme }) => theme.space(1)};
`;

export const RowTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
  margin-bottom: ${({ theme }) => theme.space(2.5)};
`;

export const RowTitle = styled.div`
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: break-word;
`;

export const RowMeta = styled.div`
  margin-top: ${({ theme }) => theme.space(0.5)};
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

export const RowRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  flex-shrink: 0;
`;
