import type {MozgoslavBridge} from "../../electron/preload";

declare global {
    interface Window {
        mozgoslav: MozgoslavBridge;
    }
}

export {};
