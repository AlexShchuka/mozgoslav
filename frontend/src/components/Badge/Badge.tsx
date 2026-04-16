import { FC, PropsWithChildren } from "react";

import { Root, BadgeTone } from "./Badge.style";

export interface BadgeProps {
  tone?: BadgeTone;
}

const Badge: FC<PropsWithChildren<BadgeProps>> = ({ tone = "neutral", children }) => (
  <Root $tone={tone}>{children}</Root>
);

export default Badge;
