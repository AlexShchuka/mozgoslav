import { forwardRef, InputHTMLAttributes, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { InputField, InputRow, InputLabel, ToggleButton, Hint, Error } from "./Input.style";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  hint?: string;
  error?: string;
  sensitive?: boolean; // password-reveal toggle
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, sensitive, type = "text", ...rest }, ref) => {
    const [revealed, setRevealed] = useState(false);
    const effectiveType = sensitive ? (revealed ? "text" : "password") : type;

    return (
      <div>
        {label && <InputLabel>{label}</InputLabel>}
        <InputRow $hasError={Boolean(error)}>
          <InputField ref={ref} type={effectiveType} spellCheck={false} {...rest} />
          {sensitive && (
            <ToggleButton
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-label={revealed ? "hide" : "reveal"}
            >
              {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
            </ToggleButton>
          )}
        </InputRow>
        {error ? <Error>{error}</Error> : hint ? <Hint>{hint}</Hint> : null}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
