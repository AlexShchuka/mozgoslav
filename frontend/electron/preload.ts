import { contextBridge, ipcRenderer } from "electron";

export interface MozgoslavBridge {
  version: string;
  openAudioFiles: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  openFolder: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  openPath: (path: string) => Promise<string | undefined>;
}

const bridge: MozgoslavBridge = {
  version: "0.1.0",
  openAudioFiles: () => ipcRenderer.invoke("dialog:openAudioFiles"),
  openFolder: () => ipcRenderer.invoke("dialog:openFolder"),
  openPath: (path) => ipcRenderer.invoke("shell:openPath", path),
};

contextBridge.exposeInMainWorld("mozgoslav", bridge);
