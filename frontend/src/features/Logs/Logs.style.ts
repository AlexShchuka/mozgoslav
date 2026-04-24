import styled from "styled-components";

export const PageRoot = styled.div`
  padding: ${({ theme }) => theme.space(6)};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(4)};
`;

export const PageTitle = styled.h1`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.xxl};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const FileName = styled.span`
  font-family: ${({ theme }) => theme.font.familyMono};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const LogPre = styled.pre`
  margin: 0;
  max-height: 70vh;
  overflow: auto;
  font-family: ${({ theme }) => theme.font.familyMono};
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;
