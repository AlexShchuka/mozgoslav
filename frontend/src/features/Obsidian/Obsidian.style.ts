import styled from "styled-components";

export const PageRoot = styled.div`
  padding: ${({ theme }) => theme.space(6)};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(4)};
`;

export const PageTitle = styled.h1`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.xxl};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const Subtitle = styled.p`
  margin: ${({ theme }) => theme.space(1)} 0 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.font.size.md};
`;

export const VaultRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};

  code {
    flex: 1;
    font-family: ${({ theme }) => theme.font.familyMono};
    font-size: ${({ theme }) => theme.font.size.sm};
    color: ${({ theme }) => theme.colors.text.secondary};
    word-break: break-all;
  }
`;

export const FolderGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(2)};
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
`;

export const FolderItem = styled.button<{ $active: boolean; $required: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2.5)};
  padding: ${({ theme }) => theme.space(3)};
  background: ${({ theme, $active }) => ($active ? theme.colors.accent.soft : theme.colors.bg.elevated2)};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.accent.primary : theme.colors.border.subtle)};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme, $active }) => ($active ? theme.colors.accent.primary : theme.colors.text.primary)};
  font-family: inherit;
  font-size: ${({ theme }) => theme.font.size.sm};
  text-align: left;
  cursor: ${({ $required }) => ($required ? "not-allowed" : "pointer")};
  opacity: ${({ $required, $active }) => ($required && $active ? 0.85 : 1)};
  transition: background ${({ theme }) => theme.motion.duration.fast}, border-color ${({ theme }) => theme.motion.duration.fast};

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }

  div {
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.space(0.5)};
  }
`;

export const FolderHint = styled.span`
  display: block;
  margin-top: ${({ theme }) => theme.space(2)};
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

// BC-025 — "Sync all" + "Apply PARA" sit side-by-side on the Obsidian tab.
export const BulkButtonRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space(2)};
  flex-wrap: wrap;
`;
