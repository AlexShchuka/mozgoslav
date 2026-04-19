import styled from "styled-components";

export const MeterRoot = styled.div<{ $height: number }>`
    position: relative;
    width: 100%;
    height: ${({$height}) => `${$height}px`};
    background: ${({theme}) => theme.colors.bg.elevated1};
    border-radius: ${({theme}) => theme.radii.sm};
    overflow: hidden;
`;

export const Bar = styled.div`
    position: absolute;
    inset: 0;
`;

export const MeterFill = styled.div`
    position: absolute;
    inset: 0;
    transform-origin: left center;
    transform: scaleX(0);
    background: ${({theme}) => theme.colors.accent.primary};
    transition: transform 50ms linear;
`;

export const Peak = styled.div`
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    left: 0;
    background: ${({theme}) => theme.colors.accent.secondary};
    box-shadow: 0 0 4px ${({theme}) => theme.colors.accent.glow};
    transition: left 80ms linear;
`;
