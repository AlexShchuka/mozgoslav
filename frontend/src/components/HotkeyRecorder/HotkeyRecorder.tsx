import {FC, KeyboardEvent, useCallback, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {Keyboard, Trash2} from "lucide-react";

import Button from "../Button";
import {Actions, Field, Hint, Placeholder, Root, Value} from "./HotkeyRecorder.style";

export interface HotkeyRecorderProps {
    value: string;
    onChange: (accelerator: string) => void;
    hint?: string;
    testId?: string;
}

const MODIFIER_ORDER = ["CommandOrControl", "Alt", "Shift"] as const;

const HotkeyRecorder: FC<HotkeyRecorderProps> = ({value, onChange, hint, testId = ""}) => {
    const {t} = useTranslation();
    const [recording, setRecording] = useState(false);

    const keyLabel = useMemo(() => formatForDisplay(value), [value]);

    const handleKeyDown = useCallback(
        (ev: KeyboardEvent<HTMLDivElement>) => {
            if (!recording) return;
            ev.preventDefault();
            ev.stopPropagation();
            const accelerator = buildAccelerator(ev);
            if (!accelerator) return; 
            onChange(accelerator);
            setRecording(false);
        },
        [recording, onChange],
    );

    const handleClear = useCallback(() => {
        onChange("");
        setRecording(false);
    }, [onChange]);

    return (
        <Root>
            <Field
                role="button"
                tabIndex={0}
                $recording={recording}
                onClick={() => setRecording(true)}
                onBlur={() => setRecording(false)}
                onKeyDown={handleKeyDown}
                data-testid={`hotkey-recorder${testId ? `-${testId}` : ""}`}
            >
                {recording ? (
                    <Placeholder>{t("hotkeyRecorder.pressCombo")}</Placeholder>
                ) : value ? (
                    <Value>
                        <Keyboard size={14}/>
                        {keyLabel}
                    </Value>
                ) : (
                    <Placeholder>{t("hotkeyRecorder.empty")}</Placeholder>
                )}
            </Field>
            <Actions>
                {value && (
                    <Button
                        variant="ghost"
                        leftIcon={<Trash2 size={14}/>}
                        onClick={handleClear}
                        data-testid={`hotkey-recorder-clear${testId ? `-${testId}` : ""}`}
                    >
                        {t("hotkeyRecorder.clear")}
                    </Button>
                )}
            </Actions>
            {hint && <Hint>{hint}</Hint>}
        </Root>
    );
};

export default HotkeyRecorder;


const buildAccelerator = (ev: KeyboardEvent): string | null => {
    const modifiers: string[] = [];
    if (ev.ctrlKey || ev.metaKey) modifiers.push("CommandOrControl");
    if (ev.altKey) modifiers.push("Alt");
    if (ev.shiftKey) modifiers.push("Shift");

    const keyName = normaliseKey(ev.key, ev.code);
    if (keyName === null) {
        return null;
    }

    if (modifiers.length === 0) {
        return null;
    }

    return [...orderModifiers(modifiers), keyName].join("+");
};

const orderModifiers = (mods: string[]): string[] =>
    MODIFIER_ORDER.filter((m) => mods.includes(m));

const MODIFIER_KEYS = new Set(["Control", "Meta", "Alt", "Shift", "OS"]);

const SPECIAL_KEY_MAP: Record<string, string> = {
    " ": "Space",
    Spacebar: "Space",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    Escape: "Esc",
    Enter: "Return",
    Tab: "Tab",
    Backspace: "Backspace",
    Delete: "Delete",
    Home: "Home",
    End: "End",
    PageUp: "PageUp",
    PageDown: "PageDown",
};

const normaliseKey = (key: string, code: string): string | null => {
    if (MODIFIER_KEYS.has(key)) return null;
    if (SPECIAL_KEY_MAP[key]) return SPECIAL_KEY_MAP[key]!;
    if (/^F\d{1,2}$/.test(key)) return key;
    if (key.length === 1) return key.toUpperCase();
    if (/^Digit\d$/.test(code)) return code.replace("Digit", "");
    return key;
};

const formatForDisplay = (accelerator: string): string => {
    if (!accelerator) return "";
    return accelerator
        .split("+")
        .map((token) => token === "CommandOrControl" ? "⌘/Ctrl" : token)
        .join(" + ");
};
