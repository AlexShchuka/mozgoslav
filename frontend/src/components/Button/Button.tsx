import { ButtonHTMLAttributes, forwardRef } from "react";

import { StyledButton, ButtonVariant, ButtonSize } from "./Button.style";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", isLoading, leftIcon, rightIcon, children, disabled, ...rest }, ref) => (
    <StyledButton ref={ref} $variant={variant} $size={size} disabled={disabled || isLoading} {...rest}>
      {leftIcon && <span className="mg-icon">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="mg-icon">{rightIcon}</span>}
    </StyledButton>
  ),
);

Button.displayName = "Button";

export default Button;
