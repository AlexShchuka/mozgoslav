import styled from "styled-components";

export const PageRoot = styled.div`
  padding: ${({ theme }) => theme.space(10)} ${({ theme }) => theme.space(6)};
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(4)};
`;

export const Title = styled.h1`
  margin: 0;
  /* B8 golden-ratio hero: 39px = 24px × φ — onboarding gets one hero surface. */
  font-size: ${({ theme }) => theme.font.size.hero};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  line-height: 1.1;
  color: ${({ theme }) => theme.colors.text};
`;

export const Subtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.font.size.md};
`;

export const StepBody = styled.div`
  padding: ${({ theme }) => theme.space(3)} 0;
`;

export const StepTitle = styled.h2`
  margin: 0 0 ${({ theme }) => theme.space(1.5)};
  font-size: ${({ theme }) => theme.font.size.xl};
  color: ${({ theme }) => theme.colors.text};
`;

export const StepHint = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.font.size.md};
  line-height: 1.6;
`;

export const StepDots = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space(1)};
  justify-content: center;
`;

export const Dot = styled.span<{ $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.border)};
  transition: background ${({ theme }) => theme.motion.base};
`;

export const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
`;
