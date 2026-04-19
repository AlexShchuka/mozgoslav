import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import path from "node:path";

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
        },
    },
    plugins: [
        react(),
        electron({
            main: {
                entry: "electron/main.ts",
                vite: {
                    build: {
                        outDir: "dist-electron",
                        rollupOptions: {
                            external: ["electron", "uiohook-napi"],
                        },
                    },
                },
            },
            preload: {
                input: "electron/preload.ts",
                vite: {
                    build: {
                        outDir: "dist-electron",
                        rollupOptions: {
                            external: ["electron"],
                        },
                    },
                },
            },
            renderer: {},
        }),
    ],
    build: {
        outDir: "dist",
        emptyOutDir: true,
    },
    server: {
        port: 5173,
    },
});
