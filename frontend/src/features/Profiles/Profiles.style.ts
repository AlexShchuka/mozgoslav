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

export const RowActions = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({theme}) => theme.space(3)};
`;

export const RowName = styled.div`
    font-weight: ${({theme}) => theme.font.weight.semibold};
    font-size: ${({theme}) => theme.font.size.md};
    color: ${({theme}) => theme.colors.text.primary};
`;

export const RowDescription = styled.div`
    font-size: ${({theme}) => theme.font.size.xs};
    color: ${({theme}) => theme.colors.text.secondary};
`;

const RowBadges = styled.div`
    display: flex;
    align-items: center;
    gap: ${({theme}) => theme.space(1.5)};
`;

type RowComponent = React.FC<React.HTMLAttributes<HTMLDivElement>> & { Badges: typeof RowBadges };

const RowBase = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({theme}) => theme.space(3)};
    padding: ${({theme}) => theme.space(3)} 0;
    border-bottom: 1px solid ${({theme}) => theme.colors.border.subtle};

    &:last-child {
        border-bottom: 0;
    }
`;

export const Row: RowComponent = Object.assign(RowBase, {Badges: RowBadges});
