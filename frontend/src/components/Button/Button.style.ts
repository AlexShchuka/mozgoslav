import styled, {css} from "styled-components";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
export type ButtonSize = "sm" | "md" | "lg";

const sizeStyles = {
    sm: css`
        height: 28px;
        padding: 0 ${({theme}) => theme.space(2.5)};
        font-size: ${({theme}) => theme.font.size.sm};
    `,
    md: css`
        height: 36px;
        padding: 0 ${({theme}) => theme.space(3.5)};
        font-size: ${({theme}) => theme.font.size.md};
    `,
    lg: css`
        height: 44px;
        padding: 0 ${({theme}) => theme.space(5)};
        font-size: ${({theme}) => theme.font.size.lg};
    `,
} satisfies Record<ButtonSize, ReturnType<typeof css>>;

const variantStyles = {
    primary: css`
        background: ${({theme}) => theme.colors.accent.soft};
        color: ${({theme}) => theme.colors.accent.primary};
        border: 1px solid ${({theme}) => theme.colors.accent.primary};

        &:hover:not(:disabled) {
            background: ${({theme}) => theme.colors.accent.primary};
            color: ${({theme}) => theme.colors.accent.contrast};
        }
    `,
    secondary: css`
        background: ${({theme}) => theme.colors.bg.elevated2};
        color: ${({theme}) => theme.colors.text.primary};
        border: 1px solid ${({theme}) => theme.colors.border.subtle};

        &:hover:not(:disabled) {
            border-color: ${({theme}) => theme.colors.accent.primary};
            color: ${({theme}) => theme.colors.accent.primary};
        }
    `,
    ghost: css`
        background: transparent;
        color: ${({theme}) => theme.colors.text.secondary};

        &:hover:not(:disabled) {
            background: ${({theme}) => theme.colors.accent.soft};
            color: ${({theme}) => theme.colors.accent.primary};
        }
    `,
    danger: css`
        background: rgba(248, 113, 113, 0.12);
        color: ${({theme}) => theme.colors.error};
        border: 1px solid ${({theme}) => theme.colors.error};

        &:hover:not(:disabled) {
            background: ${({theme}) => theme.colors.error};
            color: #fff;
        }
    `,
    success: css`
        background: ${({theme}) => theme.colors.success};
        color: ${({theme}) => theme.colors.accent.contrast};

        &:disabled {
            opacity: 1;
            cursor: default;
        }
    `,
} satisfies Record<ButtonVariant, ReturnType<typeof css>>;

export const StyledButton = styled.button<{ $variant: ButtonVariant; $size: ButtonSize }>`
    display: inline-flex;
    align-items: center;
    gap: ${({theme}) => theme.space(1.5)};
    border: 0;
    border-radius: ${({theme}) => theme.radii.md};
    font-weight: ${({theme}) => theme.font.weight.medium};
    cursor: pointer;
    user-select: none;
    transition: background ${({theme}) => theme.motion.duration.fast},
    color ${({theme}) => theme.motion.duration.fast},
    filter ${({theme}) => theme.motion.duration.fast},
    box-shadow ${({theme}) => theme.motion.duration.fast},
    border-color ${({theme}) => theme.motion.duration.fast};

    &:focus-visible {
        outline: 2px solid ${({theme}) => theme.colors.focusRing};
        outline-offset: 2px;
    }

    &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }

    .mg-icon {
        display: inline-flex;
        align-items: center;
    }

    ${({$size}) => sizeStyles[$size]}
    ${({$variant}) => variantStyles[$variant]}
`;
