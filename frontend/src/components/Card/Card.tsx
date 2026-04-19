import {FC, HTMLAttributes, PropsWithChildren, ReactNode} from "react";

import {CardBody, CardFooter, CardHeader, CardRoot, CardSubtitle, CardTitle} from "./Card.style";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
    title?: ReactNode;
    subtitle?: ReactNode;
    headerAction?: ReactNode;
    footer?: ReactNode;
    elevated?: boolean;
}

const Card: FC<PropsWithChildren<CardProps>> = ({
                                                    title,
                                                    subtitle,
                                                    headerAction,
                                                    footer,
                                                    elevated = false,
                                                    children,
                                                    ...rest
                                                }) => (
    <CardRoot $elevated={elevated} {...rest}>
        {(title || headerAction) && (
            <CardHeader>
                <div>
                    {title && <CardTitle>{title}</CardTitle>}
                    {subtitle && <CardSubtitle>{subtitle}</CardSubtitle>}
                </div>
                {headerAction}
            </CardHeader>
        )}
        <CardBody>{children}</CardBody>
        {footer && <CardFooter>{footer}</CardFooter>}
    </CardRoot>
);

export default Card;
