import {FC, PropsWithChildren} from "react";

import {BadgeTone, Root} from "./Badge.style";

export interface BadgeProps {
    tone?: BadgeTone;
}

const Badge: FC<PropsWithChildren<BadgeProps>> = ({tone = "neutral", children}) => (
    <Root $tone={tone}>{children}</Root>
);

export default Badge;
