import styled from "styled-components";

export const Root = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({theme}) => theme.space(3)};
  padding: ${({theme}) => theme.space(10)};
  text-align: center;
  color: ${({theme}) => theme.colors.text.secondary};
`;

export const Icon = styled.div`
  display: flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  border-radius: ${({theme}) => theme.radii.full};
  background: ${({theme}) => theme.colors.accent.soft};
  color: ${({theme}) => theme.colors.accent.primary};
`;

export const Title = styled.h3`
  margin: 0;
  font-size: ${({theme}) => theme.font.size.lg};
  font-weight: ${({theme}) => theme.font.weight.semibold};
  color: ${({theme}) => theme.colors.text.primary};
`;

export const Body = styled.p`
  margin: 0;
  max-width: 440px;
  font-size: ${({theme}) => theme.font.size.md};
`;
