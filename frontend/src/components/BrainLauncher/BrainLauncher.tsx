import { ButtonHTMLAttributes, forwardRef } from "react";
import { useReducedMotion } from "framer-motion";
import { Brain } from "lucide-react";

import { LauncherButton, IconSlot, BrainLauncherState, BrainLauncherSize } from "./BrainLauncher.style";

export interface BrainLauncherProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  state?: BrainLauncherState;
  size?: BrainLauncherSize;
  ariaLabel: string;
}

const BrainLauncher = forwardRef<HTMLButtonElement, BrainLauncherProps>(
  ({ state = "idle", size = "dock", ariaLabel, disabled, ...rest }, ref) => {
    const reduced = useReducedMotion() ?? false;
    const iconSize = size === "tray" ? 16 : 24;
    return (
      <LauncherButton
        ref={ref}
        type="button"
        aria-label={ariaLabel}
        aria-pressed={state === "recording"}
        disabled={disabled}
        $state={state}
        $size={size}
        $reduced={reduced}
        {...rest}
      >
        <IconSlot>
          <Brain size={iconSize} strokeWidth={1.75} />
        </IconSlot>
      </LauncherButton>
    );
  },
);

BrainLauncher.displayName = "BrainLauncher";

export default BrainLauncher;
