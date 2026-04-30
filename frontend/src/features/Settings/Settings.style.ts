import styled from "styled-components";

export const SettingsRoot = styled.div`
  display: flex;
  height: 100%;
  min-height: 0;
`;

export const SettingsSidebar = styled.nav`
  width: 220px;
  min-width: 220px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.subtle};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1)};
  padding: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(2)};
  overflow-y: auto;

  @media (max-width: 600px) {
    display: none;
  }
`;

export const SidebarCategory = styled.button<{ $active: boolean }>`
  appearance: none;
  border: 0;
  background: ${({ theme, $active }) => ($active ? theme.colors.accent.soft : "transparent")};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.accent.primary : theme.colors.text.secondary};
  font-family: inherit;
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme, $active }) =>
    $active ? theme.font.weight.semibold : theme.font.weight.regular};
  text-align: left;
  padding: ${({ theme }) => `${theme.space(2)} ${theme.space(3)}`};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  transition:
    background ${({ theme }) => theme.motion.duration.fast},
    color ${({ theme }) => theme.motion.duration.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.bg.elevated2};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focusRing};
    outline-offset: 2px;
  }
`;

export const SettingsContent = styled.div`
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

export const StickyHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  background: ${({ theme }) => theme.colors.bg.base};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  padding: ${({ theme }) => `${theme.space(3)} ${theme.space(6)}`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
`;

export const Breadcrumb = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`;

export const SearchInputContainer = styled.div`
  width: 100%;
  max-width: 480px;
`;

export const ContentScroll = styled.div`
  padding: ${({ theme }) => theme.space(6)};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(6)};
`;

export const CategorySection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(4)};
`;

export const CategoryTitle = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.xl};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  padding-bottom: ${({ theme }) => theme.space(2)};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

export const SubSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(3)};
`;

export const SubSectionTitle = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const FormGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(4)};
  grid-template-columns: 1fr 1fr;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }

  label {
    display: block;
    margin-bottom: ${({ theme }) => theme.space(1.5)};
    font-size: ${({ theme }) => theme.font.size.sm};
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

export const Row = styled.div`
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.space(2)};
  grid-column: 1 / -1;

  & > div {
    flex: 1;
  }
`;

export const SelectBox = styled.select<{ $hasError?: boolean }>`
  width: 100%;
  height: 40px;
  padding: 0 ${({ theme }) => theme.space(3)};
  background: ${({ theme }) => theme.colors.bg.elevated2};
  color: ${({ theme }) => theme.colors.text.primary};
  border: 1px solid
    ${({ theme, $hasError }) => ($hasError ? theme.colors.error : theme.colors.border.subtle)};
  border-radius: ${({ theme }) => theme.radii.md};
  font-family: inherit;
  font-size: ${({ theme }) => theme.font.size.md};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focusRing};
    outline-offset: 2px;
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const SelectOption = styled.option`
  background: ${({ theme }) => theme.colors.bg.elevated2};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
`;

export const SectionHeader = styled.button<{ $expanded: boolean }>`
  appearance: none;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background: ${({ theme }) => theme.colors.bg.elevated2};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => `${theme.space(2.5)} ${theme.space(3)}`};
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font: inherit;
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: left;
  transition: border-color ${({ theme }) => theme.motion.duration.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focusRing};
    outline-offset: 2px;
  }

  &::after {
    content: "${({ $expanded }) => ($expanded ? "−" : "+")}";
    font-size: ${({ theme }) => theme.font.size.lg};
    color: ${({ theme }) => theme.colors.text.secondary};
    margin-left: ${({ theme }) => theme.space(2)};
  }
`;

export const ModelOption = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(1)};
`;

export const CapabilityBadges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space(1)};
`;

export const FieldError = styled.span`
  display: block;
  margin-top: ${({ theme }) => theme.space(0.5)};
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.error};
`;

export const FieldHint = styled.span`
  display: block;
  margin-top: ${({ theme }) => theme.space(0.5)};
  font-size: ${({ theme }) => theme.font.size.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

export const InlineEmpty = styled.p`
  margin: 0;
  padding: ${({ theme }) => theme.space(2)};
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px dashed ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.sm};
`;

export const HighlightMark = styled.mark`
  background: ${({ theme }) => theme.colors.accent.soft};
  color: ${({ theme }) => theme.colors.accent.primary};
  border-radius: 2px;
  padding: 0 2px;
`;

export const SearchEmptyState = styled.p`
  margin: 0;
  padding: ${({ theme }) => theme.space(4)};
  font-size: ${({ theme }) => theme.font.size.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
`;

export const FieldRing = styled.div<{ $active: boolean }>`
  border-radius: ${({ theme }) => theme.radii.md};
  outline: ${({ theme, $active }) =>
    $active ? `2px solid ${theme.colors.accent.primary}` : "none"};
  outline-offset: 3px;
  transition: outline ${({ theme }) => theme.motion.duration.base};
`;

export const SystemLinkCard = styled.a`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.space(3)} ${theme.space(4)}`};
  background: ${({ theme }) => theme.colors.bg.elevated2};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  transition:
    border-color ${({ theme }) => theme.motion.duration.fast},
    background ${({ theme }) => theme.motion.duration.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    background: ${({ theme }) => theme.colors.accent.soft};
    color: ${({ theme }) => theme.colors.accent.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focusRing};
    outline-offset: 2px;
  }
`;

export const SystemLinksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: ${({ theme }) => theme.space(3)};
`;

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

export const Tabs = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space(1)};
  padding: ${({ theme }) => theme.space(1)};
  background: ${({ theme }) => theme.colors.bg.elevated2};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.md};
  align-self: flex-start;
`;

export const Tab = styled.button<{ $active: boolean }>`
  border: 0;
  cursor: pointer;
  padding: ${({ theme }) => `${theme.space(1.5)} ${theme.space(3)}`};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.accent.primary : theme.colors.text.secondary};
  background: ${({ theme, $active }) => ($active ? theme.colors.accent.soft : "transparent")};
  border-radius: ${({ theme }) => theme.radii.sm};
  transition:
    background ${({ theme }) => theme.motion.duration.fast},
    color ${({ theme }) => theme.motion.duration.fast};
  font-family: inherit;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

export const Toolbar = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space(2)};
`;
