import {FC} from "react";

import {Fill, Label, Shimmer, Track, Wrapper} from "./ProgressBar.style";

export interface ProgressBarProps {
    value: number; // 0..100
    label?: string;
    status?: "active" | "success" | "error" | "idle";
    showPercent?: boolean;
    indeterminate?: boolean;
}

const ProgressBar: FC<ProgressBarProps> = ({
                                               value,
                                               label,
                                               status = "active",
                                               showPercent = true,
                                               indeterminate = false,
                                           }) => {
    const clamped = Math.max(0, Math.min(100, value));
    return (
        <Wrapper>
            {(label || showPercent) && (
                <Label>
                    {label && <span>{label}</span>}
                    {showPercent && !indeterminate && <span>{clamped}%</span>}
                </Label>
            )}
            <Track $status={status}>
                {indeterminate ? (
                    <Shimmer/>
                ) : (
                    <Fill $status={status} style={{width: `${clamped}%`}}/>
                )}
            </Track>
        </Wrapper>
    );
};

export default ProgressBar;
