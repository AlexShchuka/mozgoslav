import styled, {css, keyframes} from "styled-components";

export const ChatRoot = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: ${({theme}) => theme.colors.bg.base};
`;

export const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({theme}) => theme.space(3)};
  padding: ${({theme}) => `${theme.space(4)} ${theme.space(6)}`};
  border-bottom: 1px solid ${({theme}) => theme.colors.border.subtle};
  background: ${({theme}) => theme.colors.bg.elevated2};
`;

export const Title = styled.h1`
  margin: 0;
  font-size: ${({theme}) => theme.font.size.lg};
  font-weight: ${({theme}) => theme.font.weight.semibold};
  color: ${({theme}) => theme.colors.text.primary};
`;

export const MessageList = styled.ol`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin: 0;
  padding: ${({theme}) => `${theme.space(6)} ${theme.space(6)} ${theme.space(8)}`};
  display: flex;
  flex-direction: column;
  gap: ${({theme}) => theme.space(5)};
  list-style: none;
`;

export const EmptyState = styled.div`
  margin: auto;
  text-align: center;
  color: ${({theme}) => theme.colors.text.secondary};
  font-size: ${({theme}) => theme.font.size.md};
  max-width: 420px;
`;

export const MessageRow = styled.div<{ $role: "user" | "assistant" }>`
  display: flex;
  justify-content: ${({$role}) => ($role === "user" ? "flex-end" : "flex-start")};
`;

export const MessageContent = styled.div<{ $role: "user" | "assistant" }>`
  max-width: 720px;
  white-space: pre-wrap;
  line-height: 1.55;
  font-size: ${({theme}) => theme.font.size.md};
  color: ${({theme, $role}) =>
    $role === "user" ? theme.colors.text.primary : theme.colors.text.primary};
  ${({$role, theme}) =>
    $role === "user"
        ? css`
          padding: ${theme.space(2)} ${theme.space(3)};
          background: ${theme.colors.accent.soft};
          color: ${theme.colors.text.primary};
          border-radius: ${theme.radii.md};
        `
        : css`
          padding: 0;
        `}
`;

export const Warning = styled.div`
  margin-top: ${({theme}) => theme.space(2)};
  padding: ${({theme}) => `${theme.space(2)} ${theme.space(3)}`};
  background: transparent;
  border-left: 2px solid ${({theme}) => theme.colors.warning};
  color: ${({theme}) => theme.colors.warning};
  font-size: ${({theme}) => theme.font.size.sm};
`;

export const ErrorRow = styled.div`
  color: ${({theme}) => theme.colors.error};
  font-size: ${({theme}) => theme.font.size.sm};
`;

export const CitationRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({theme}) => theme.space(2)};
  margin-top: ${({theme}) => theme.space(3)};
`;

export const CitationChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({theme}) => theme.space(1)};
  padding: ${({theme}) => `${theme.space(1)} ${theme.space(2)}`};
  border-radius: ${({theme}) => theme.radii.full};
  border: 1px solid ${({theme}) => theme.colors.border.subtle};
  background: ${({theme}) => theme.colors.bg.elevated2};
  color: ${({theme}) => theme.colors.text.secondary};
  font-size: ${({theme}) => theme.font.size.xs};
  font-weight: ${({theme}) => theme.font.weight.medium};
  cursor: pointer;
  transition: border-color ${({theme}) => theme.motion.duration.fast},
    color ${({theme}) => theme.motion.duration.fast};
  &:hover {
    border-color: ${({theme}) => theme.colors.accent.primary};
    color: ${({theme}) => theme.colors.accent.primary};
  }
`;

const dotPulse = keyframes`
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.75); }
  40% { opacity: 1; transform: scale(1); }
`;

export const TypingDots = styled.div`
  display: inline-flex;
  gap: ${({theme}) => theme.space(1)};
  padding: ${({theme}) => theme.space(1)} 0;
  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({theme}) => theme.colors.text.secondary};
    animation: ${dotPulse} 1.2s infinite ease-in-out;
  }
  span:nth-child(2) {
    animation-delay: 0.15s;
  }
  span:nth-child(3) {
    animation-delay: 0.3s;
  }
`;

export const InputBar = styled.form`
  display: flex;
  align-items: flex-end;
  gap: ${({theme}) => theme.space(2)};
  padding: ${({theme}) => `${theme.space(3)} ${theme.space(6)} ${theme.space(5)}`};
  border-top: 1px solid ${({theme}) => theme.colors.border.subtle};
  background: ${({theme}) => theme.colors.bg.elevated2};
`;

export const InputField = styled.textarea`
  flex: 1;
  min-height: 44px;
  max-height: 220px;
  padding: ${({theme}) => `${theme.space(2.5)} ${theme.space(3)}`};
  resize: none;
  border: 1px solid ${({theme}) => theme.colors.border.subtle};
  border-radius: ${({theme}) => theme.radii.md};
  font-family: ${({theme}) => theme.font.family};
  font-size: ${({theme}) => theme.font.size.md};
  background: ${({theme}) => theme.colors.bg.base};
  color: ${({theme}) => theme.colors.text.primary};
  line-height: 1.4;
  &:focus {
    outline: none;
    border-color: ${({theme}) => theme.colors.accent.primary};
    box-shadow: 0 0 0 3px ${({theme}) => theme.colors.focusRing};
  }
`;
