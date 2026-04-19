import {FC} from "react";
import {Inbox} from "lucide-react";

import {Body, Icon, Root, Title} from "./EmptyState.style";

export interface EmptyStateProps {
    title: React.ReactNode;
    body?: React.ReactNode;
    icon?: React.ReactNode;
}

const EmptyState: FC<EmptyStateProps> = ({title, body, icon}) => (
    <Root>
        <Icon>{icon ?? <Inbox size={28}/>}</Icon>
        <Title>{title}</Title>
        {body && <Body>{body}</Body>}
    </Root>
);

export default EmptyState;
