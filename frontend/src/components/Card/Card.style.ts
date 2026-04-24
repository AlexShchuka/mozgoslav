import styled from "styled-components";

export const CardRoot = styled.section<{ $elevated: boolean }>`
  background: ${({ theme, $elevated }) =>
    $elevated ? theme.colors.bg.elevated3 : theme.colors.bg.elevated2};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme, $elevated }) => ($elevated ? theme.shadow.md : theme.shadow.sm)};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const CardHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(4)};
  padding: ${({ theme }) => theme.space(4)};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

export const CardTitle = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const CardSubtitle = styled.p`
  margin: ${({ theme }) => theme.space(1)} 0 0;
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const CardBody = styled.div`
  padding: ${({ theme }) => theme.space(4)};
`;

export const CardFooter = styled.footer`
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background: ${({ theme }) => theme.colors.bg.base};
`;
