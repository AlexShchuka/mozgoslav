import styled from "styled-components";

export const ListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: ${({ theme }) => theme.space(4)};
`;

export const Title = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.xl};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.01em;
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

export const Meta = styled.span`
  font-variant-numeric: tabular-nums;
`;

export const UserHintText = styled.span`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.font.size.sm};
  margin-left: ${({ theme }) => theme.space(2)};
`;
