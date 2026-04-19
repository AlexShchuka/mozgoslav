import styled from "styled-components";

/**
 * U2 — kbar-powered command palette styled with ADR-013 tokens. All colours,
 * typography, radii, spacing and motion durations come from the theme so
 * light/dark switching is automatic. Fixed-pixel values only survive where
 * no token applies (shadow offsets, backdrop blur radius, hint chip padding).
 */

export const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(10, 12, 18, 0.55);
    backdrop-filter: blur(10px) saturate(140%);
    -webkit-backdrop-filter: blur(10px) saturate(140%);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 12vh;
    z-index: 1000;
`;

export const Palette = styled.div`
    width: min(640px, 90vw);
    background: ${({theme}) => theme.colors.bg.elevated3};
    border: 1px solid ${({theme}) => theme.colors.border.subtle};
    border-radius: ${({theme}) => theme.radii.lg};
    box-shadow: ${({theme}) => theme.shadow.lg},
    0 0 0 1px ${({theme}) => theme.colors.accent.glow};
    overflow: hidden;
`;

export const Input = styled.input`
    width: 100%;
    background: transparent;
    border: 0;
    outline: 0;
    padding: ${({theme}) => `${theme.space(4)} ${theme.space(5)}`};
    font-family: inherit;
    font-size: ${({theme}) => theme.font.size.lg};
    color: ${({theme}) => theme.colors.text.primary};
    border-bottom: 1px solid ${({theme}) => theme.colors.border.subtle};

    &::placeholder {
        color: ${({theme}) => theme.colors.text.muted};
    }
`;

export const Section = styled.div`
    max-height: 360px;
    overflow: auto;
`;

export const ItemList = styled.div`
    display: flex;
    flex-direction: column;
    padding: ${({theme}) => theme.space(1)};
`;

export const SectionHeader = styled.div`
    padding: ${({theme}) => `${theme.space(2)} ${theme.space(3)}`};
    font-size: ${({theme}) => theme.font.size.xs};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${({theme}) => theme.colors.text.muted};
    font-weight: ${({theme}) => theme.font.weight.medium};
`;

export const Item = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: ${({theme}) => theme.space(2.5)};
    padding: ${({theme}) => `${theme.space(2.5)} ${theme.space(3)}`};
    border: 0;
    background: ${({theme, $active}) => ($active ? theme.colors.accent.soft : "transparent")};
    color: ${({theme, $active}) => ($active ? theme.colors.accent.primary : theme.colors.text.primary)};
    border-radius: ${({theme}) => theme.radii.md};
    font-family: inherit;
    font-size: ${({theme}) => theme.font.size.md};
    cursor: pointer;
    text-align: left;
    transition: background ${({theme}) => theme.motion.duration.fast},
    color ${({theme}) => theme.motion.duration.fast};

    span {
        flex: 1;
    }

    &:hover {
        background: ${({theme}) => theme.colors.accent.soft};
    }

    &:focus-visible {
        outline: 2px solid ${({theme}) => theme.colors.focusRing};
        outline-offset: 2px;
    }
`;

export const ItemHint = styled.kbd`
    flex: 0 !important;
    font-family: ${({theme}) => theme.font.familyMono};
    font-size: ${({theme}) => theme.font.size.xs};
    color: ${({theme}) => theme.colors.text.muted};
    background: ${({theme}) => theme.colors.bg.base};
    border: 1px solid ${({theme}) => theme.colors.border.subtle};
    padding: 2px 6px;
    border-radius: ${({theme}) => theme.radii.sm};
`;

export const FooterHint = styled.div`
    display: flex;
    align-items: center;
    gap: ${({theme}) => theme.space(2)};
    padding: ${({theme}) => `${theme.space(2)} ${theme.space(4)}`};
    border-top: 1px solid ${({theme}) => theme.colors.border.subtle};
    background: ${({theme}) => theme.colors.bg.elevated2};
    font-size: ${({theme}) => theme.font.size.xs};
    color: ${({theme}) => theme.colors.text.muted};
`;

export const Chip = styled.kbd`
    font-family: ${({theme}) => theme.font.familyMono};
    font-size: ${({theme}) => theme.font.size.xs};
    color: ${({theme}) => theme.colors.text.secondary};
    background: ${({theme}) => theme.colors.bg.base};
    border: 1px solid ${({theme}) => theme.colors.border.subtle};
    padding: 2px 6px;
    border-radius: ${({theme}) => theme.radii.sm};
`;
