import styled from "styled-components";

export const ChatRoot = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: ${({ theme }) => theme.space(6)};
  gap: ${({ theme }) => theme.space(4)};
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
`;

export const Title = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.xl};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
`;

export const History = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(4)};
  overflow-y: auto;
  padding-right: ${({ theme }) => theme.space(2)};
`;

export const Bubble = styled.div<{ $role: "user" | "assistant" }>`
  align-self: ${({ $role }) => ($role === "user" ? "flex-end" : "flex-start")};
  max-width: 78%;
  padding: ${({ theme }) => `${theme.space(3)} ${theme.space(4)}`};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme, $role }) =>
    $role === "user" ? theme.colors.accentSoft : theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  white-space: pre-wrap;
  line-height: 1.5;
`;

export const CitationList = styled.ul`
  margin: ${({ theme }) => theme.space(3)} 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
`;

export const CitationItem = styled.li`
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  border-left: 2px solid ${({ theme }) => theme.colors.accent};
  background: ${({ theme }) => theme.colors.bg};
  border-radius: ${({ theme }) => theme.radii.sm};
`;

export const CitationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.space(1)};
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
`;

export const InputRow = styled.form`
  display: flex;
  gap: ${({ theme }) => theme.space(2)};
  align-items: flex-end;
`;

export const QuestionArea = styled.textarea`
  flex: 1;
  min-height: 60px;
  padding: ${({ theme }) => theme.space(3)};
  resize: vertical;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  font-family: ${({ theme }) => theme.font.family};
  font-size: ${({ theme }) => theme.font.size.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.accent};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing};
  }
`;

export const Warning = styled.div`
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.warning};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.warning};
  font-size: ${({ theme }) => theme.font.size.sm};
`;
