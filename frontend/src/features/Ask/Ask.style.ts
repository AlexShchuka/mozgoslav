import styled, { css } from "styled-components";

export const AskRoot = styled.section`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${({ theme }) => theme.colors.bg.base};
`;

export const Header = styled.header`
  padding: ${({ theme }) => `${theme.space(4)} ${theme.space(6)}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const Title = styled.h1`
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

export const MessageList = styled.ol`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => `${theme.space(4)} ${theme.space(6)}`};
  margin: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(4)};
`;

export const MessageListItem = styled.li`
  list-style: none;
`;

export const EmptyState = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.font.size.sm};
  text-align: center;
  margin: auto;
`;

export const MessageRow = styled.div<{ $role: "user" | "assistant" }>`
  display: flex;
  justify-content: ${({ $role }) => ($role === "user" ? "flex-end" : "flex-start")};
`;

export const MessageBubble = styled.div<{ $role: "user" | "assistant" }>`
  max-width: 75%;
  padding: ${({ theme }) => `${theme.space(3)} ${theme.space(4)}`};
  border-radius: ${({ theme }) => theme.radii.lg};
  font-size: ${({ theme }) => theme.font.size.sm};
  line-height: 1.6;
  ${({ $role, theme }) =>
    $role === "user"
      ? css`
          background: ${theme.colors.accent.soft};
          color: ${theme.colors.text.primary};
        `
      : css`
          background: ${theme.colors.bg.elevated1};
          color: ${theme.colors.text.primary};
          border: 1px solid ${theme.colors.border.subtle};
        `}
`;

export const CitationGroups = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
  margin-top: ${({ theme }) => theme.space(3)};
`;

export const CitationGroupTitle = styled.p`
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0 0 ${({ theme }) => theme.space(1)};
`;

export const CitationChipCorpus = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1)};
  padding: ${({ theme }) => `${theme.space(1)} ${theme.space(2)}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background: ${({ theme }) => theme.colors.bg.elevated2};
  color: ${({ theme }) => theme.colors.accent.primary};
  font-size: ${({ theme }) => theme.font.size.xs};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.accent.soft};
  }
`;

export const CitationChipWeb = styled.a`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1)};
  padding: ${({ theme }) => `${theme.space(1)} ${theme.space(2)}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background: ${({ theme }) => theme.colors.bg.elevated2};
  color: ${({ theme }) => theme.colors.info};
  font-size: ${({ theme }) => theme.font.size.xs};
  text-decoration: none;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.infoSoft};
  }
`;

export const CitationChipVault = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1)};
  padding: ${({ theme }) => `${theme.space(1)} ${theme.space(2)}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background: ${({ theme }) => theme.colors.bg.elevated2};
  color: ${({ theme }) => theme.colors.success};
  font-size: ${({ theme }) => theme.font.size.xs};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.successSoft};
  }
`;

export const TypingDots = styled.span`
  display: inline-flex;
  gap: ${({ theme }) => theme.space(1)};
  align-items: center;
  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.text.muted};
    animation: blink 1.4s infinite both;
    &:nth-child(2) {
      animation-delay: 0.2s;
    }
    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }

  @keyframes blink {
    0%,
    80%,
    100% {
      opacity: 0.2;
    }
    40% {
      opacity: 1;
    }
  }
`;

export const InputBar = styled.form`
  display: flex;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => `${theme.space(3)} ${theme.space(6)}`};
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background: ${({ theme }) => theme.colors.bg.elevated1};
`;

export const InputField = styled.textarea`
  flex: 1;
  background: ${({ theme }) => theme.colors.bg.base};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => `${theme.space(2)} ${theme.space(3)}`};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-family: ${({ theme }) => theme.font.family};
  color: ${({ theme }) => theme.colors.text.primary};
  resize: none;
  outline: none;
  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.focusRing};
  }
  &:disabled {
    opacity: 0.5;
  }
`;

export const IncludeWebToggle = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1)};
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  white-space: nowrap;
  input {
    cursor: pointer;
  }
`;
