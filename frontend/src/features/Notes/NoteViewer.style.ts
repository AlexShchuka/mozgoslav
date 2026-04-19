import styled from "styled-components";

export const PageRoot = styled.div`
  padding: ${({theme}) => theme.space(6)};
  display: flex;
  flex-direction: column;
  gap: ${({theme}) => theme.space(4)};
`;

export const PageTitle = styled.h1`
  margin: 0;
  font-size: ${({theme}) => theme.font.size.xxl};
  font-weight: ${({theme}) => theme.font.weight.semibold};
  color: ${({theme}) => theme.colors.text.primary};
`;

export const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({theme}) => theme.space(3)};
  color: ${({theme}) => theme.colors.text.secondary};
  font-size: ${({theme}) => theme.font.size.sm};
`;

export const Actions = styled.div`
  display: flex;
  gap: ${({theme}) => theme.space(2)};
`;

export const MarkdownBody = styled.div`
  line-height: 1.6;
  color: ${({theme}) => theme.colors.text.primary};

  h1, h2, h3 {
    margin-top: ${({theme}) => theme.space(5)};
    color: ${({theme}) => theme.colors.text.primary};
  }

  h1 { font-size: ${({theme}) => theme.font.size.xl}; }
  h2 { font-size: ${({theme}) => theme.font.size.lg}; }
  h3 { font-size: ${({theme}) => theme.font.size.md}; }

  p, li { color: ${({theme}) => theme.colors.text.primary}; }

  /* T3 speaker header. The markdown bold wrapper for speaker labels renders
     as <strong>; tint it with the accent colour so it stands out from the
     transcript body without needing a dedicated heading tag. */
  strong {
    color: ${({theme}) => theme.colors.accent.primary};
    font-weight: ${({theme}) => theme.font.weight.semibold};
  }

  code {
    padding: 2px 6px;
    border-radius: ${({theme}) => theme.radii.sm};
    background: ${({theme}) => theme.colors.bg.base};
    font-size: 0.9em;
  }

  pre {
    padding: ${({theme}) => theme.space(3)};
    background: ${({theme}) => theme.colors.bg.base};
    border: 1px solid ${({theme}) => theme.colors.border.subtle};
    border-radius: ${({theme}) => theme.radii.md};
    overflow: auto;
  }

  blockquote {
    margin: ${({theme}) => theme.space(3)} 0;
    padding-left: ${({theme}) => theme.space(3)};
    border-left: 3px solid ${({theme}) => theme.colors.accent.primary};
    color: ${({theme}) => theme.colors.text.secondary};
  }
`;
