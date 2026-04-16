import React, { FC, PropsWithChildren, HTMLAttributes } from "react";

import { CardRoot, CardHeader, CardTitle, CardSubtitle, CardBody, CardFooter } from "./Card.style";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
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
