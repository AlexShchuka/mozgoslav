import styled from "styled-components";

export const ListHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 16px;
`;

export const Title = styled.h2`
    font-size: 22px;
    font-weight: 600;
    margin: 0;
`;

export const EmptyState = styled.div`
    padding: 40px;
    text-align: center;
    color: #9aa0a6;
    border: 1px dashed #2a2e37;
    border-radius: 8px;
`;

export const List = styled.ul`
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const Item = styled.li`
    padding: 14px 16px;
    border-radius: 8px;
    background-color: #171a21;
    border: 1px solid #22262f;
    display: flex;
    justify-content: space-between;
    gap: 12px;
`;

export const FileName = styled.span`
    font-weight: 500;
    color: #f0f0f0;
`;

export const Meta = styled.span`
    color: #9aa0a6;
    font-size: 13px;
`;

export const ErrorText = styled.div`
    color: #f08c8c;
    margin-bottom: 12px;
`;
