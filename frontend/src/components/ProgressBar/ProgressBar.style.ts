import styled, {css, keyframes} from "styled-components";

type Status = "active" | "success" | "error" | "idle";

const colorByStatus = (status: Status) =>
    css`
        ${({theme}) => ({
            active: theme.colors.accent.primary,
            success: theme.colors.success,
            error: theme.colors.error,
            idle: theme.colors.border.subtle,
        })[status]}
    `;

const shimmerKeyframes = keyframes`
    0% {
        transform: translateX(-100%);
    }
    100% {
        transform: translateX(100%);
    }
`;

const pulse = keyframes`
    0%, 100% {
        filter: brightness(1);
    }
    50% {
        filter: brightness(1.15);
    }
`;

export const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({theme}) => theme.space(1.5)};
    width: 100%;
`;

export const Label = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: ${({theme}) => theme.font.size.sm};
    color: ${({theme}) => theme.colors.text.secondary};

    & > :last-child {
        font-variant-numeric: tabular-nums;
        font-weight: ${({theme}) => theme.font.weight.medium};
        color: ${({theme}) => theme.colors.text.primary};
    }
`;

export const Track = styled.div<{ $status: Status }>`
    position: relative;
    width: 100%;
    height: 6px;
    background: ${({theme}) => theme.colors.border.subtle};
    border-radius: ${({theme}) => theme.radii.full};
    overflow: hidden;
`;

export const Fill = styled.div<{ $status: Status }>`
    height: 100%;
    background: ${({$status}) => colorByStatus($status)};
    border-radius: inherit;
    transition: width ${({theme}) => theme.motion.duration.base} ease-out;
    animation: ${({$status}) => ($status === "active" ? pulse : "none")} 2s ease-in-out infinite;
`;

export const Shimmer = styled.div`
    position: absolute;
    inset: 0;
    background: linear-gradient(
            90deg,
            transparent 0%,
            ${({theme}) => theme.colors.accent.primary} 50%,
            transparent 100%
    );
    animation: ${shimmerKeyframes} 1.4s ease-in-out infinite;
`;
