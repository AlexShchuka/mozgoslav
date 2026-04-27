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

export const FolderHint = styled.span`
  display: block;
  margin-top: ${({ theme }) => theme.space(2)};
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const ButtonRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space(2)};
  flex-wrap: wrap;
`;

export const DiagnosticsGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(2)};
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
`;

export const DiagnosticsChip = styled.div<{ $severity: "OK" | "ADVISORY" | "WARNING" | "ERROR" }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1)};
  padding: ${({ theme }) => theme.space(3)};
  background: ${({ theme }) => theme.colors.bg.elevated2};
  border: 1px solid
    ${({ theme, $severity }) => {
      switch ($severity) {
        case "OK":
          return theme.colors.accent.primary;
        case "ADVISORY":
          return theme.colors.border.subtle;
        case "WARNING":
          return theme.colors.warning;
        case "ERROR":
          return theme.colors.error;
        default:
          return theme.colors.border.subtle;
      }
    }};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const DiagnosticsChipTitle = styled.strong`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1)};
  font-size: ${({ theme }) => theme.font.size.md};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const DiagnosticsChipMessage = styled.span`
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.4;
`;

export const EmptyStateBanner = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(3)};
  background: ${({ theme }) => theme.colors.bg.elevated2};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const Stepper = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(2)};
`;

export const StepItem = styled.li<{ $state: "pending" | "active" | "done" }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  padding: ${({ theme }) => theme.space(2)} ${({ theme }) => theme.space(3)};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid
    ${({ theme, $state }) => {
      switch ($state) {
        case "active":
          return theme.colors.accent.primary;
        case "done":
          return theme.colors.accent.primary;
        case "pending":
        default:
          return theme.colors.border.subtle;
      }
    }};
  background: ${({ theme, $state }) =>
    $state === "active" ? theme.colors.accent.soft : theme.colors.bg.elevated2};
  color: ${({ theme, $state }) =>
    $state === "active" ? theme.colors.accent.primary : theme.colors.text.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

export const StepBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: ${({ theme }) => theme.radii.full ?? "999px"};
  background: ${({ theme }) => theme.colors.bg.elevated1};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
`;

export const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.font.size.sm};
  padding: ${({ theme }) => theme.space(2)} 0;
`;
