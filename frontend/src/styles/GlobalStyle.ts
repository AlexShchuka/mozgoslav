import {createGlobalStyle} from "styled-components";

export const GlobalStyle = createGlobalStyle`
  :root {
    color-scheme: ${({theme}) => theme.mode};
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%;
    margin: 0;
  }

  body {
    background: ${({theme}) => theme.colors.bg.base};
    color: ${({theme}) => theme.colors.text.primary};
    font-family: ${({theme}) => theme.font.family};
    font-size: ${({theme}) => theme.font.size.md};
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow: hidden;
  }

  button {
    font-family: inherit;
  }

  code, pre, kbd {
    font-family: ${({theme}) => theme.font.familyMono};
  }

  /* ADR-013 — use accent.glow on selection so it reads as a brand moment. */
  ::selection {
    background: ${({theme}) => theme.colors.accent.soft};
    color: ${({theme}) => theme.colors.text.primary};
  }

  a {
    color: ${({theme}) => theme.colors.accent.primary};
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  /* ADR-013 — reduced-motion fallback. Kills looping keyframe animations
     (shimmer, pulse, spin) for users with prefers-reduced-motion: reduce,
     while leaving short transitions intact so hover/focus affordances still
     work. Per-variant boxShadow pulses that framer-motion keeps running are
     handled by the reduced*Variants exports in styles/motion.ts. */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
    }
  }

  /* scrollbar */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: ${({theme}) => theme.colors.border.subtle};
    border-radius: ${({theme}) => theme.radii.full};
  }
  ::-webkit-scrollbar-thumb:hover {
    background: ${({theme}) => theme.colors.text.muted};
  }
`;
