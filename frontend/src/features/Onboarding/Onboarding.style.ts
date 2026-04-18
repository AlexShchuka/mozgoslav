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
  font-size: ${({ theme }) => theme.font.size.xxl};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const Subtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.font.size.md};
`;

export const StepBody = styled.div`
  padding: ${({ theme }) => theme.space(3)} 0;
`;

export const StepTitle = styled.h2`
  margin: 0 0 ${({ theme }) => theme.space(1.5)};
  font-size: ${({ theme }) => theme.font.size.xl};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const StepHint = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
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
  background: ${({ theme, $active }) => ($active ? theme.colors.accent.primary : theme.colors.border.subtle)};
  transition: background ${({ theme }) => theme.motion.duration.base};
`;

export const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.space(2)};
`;

// BC-040 / Bug 25 — Skip reads as grey with ≤ 60 % opacity, no border. Keeps
// the primary "Next" the dominant call-to-action.
export const SkipButton = styled.button`
  appearance: none;
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: ${({ theme }) => theme.space(1.5)} ${({ theme }) => theme.space(2)};
  color: ${({ theme }) => theme.colors.text.muted};
  font: inherit;
  font-size: ${({ theme }) => theme.font.size.sm};
  opacity: 0.6; /* contract with BC-040 */

  &:hover {
    opacity: 0.75;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focusRing};
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`;

// BC-040 Welcome — brand wordmark enters with a subtle 450 ms ease-out.
export const BrandMark = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space(2)};
  font-size: ${({ theme }) => theme.font.size.xxl};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.colors.accent.primary};
`;
