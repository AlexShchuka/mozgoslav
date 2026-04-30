import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../src");

const BANNED = ["#7c3aed", "#a78bfa", "#ede9fe", "#2d2154"] as const;

const WALK_EXT = new Set([".ts", ".tsx", ".css"]);

const walk = (dir: string, acc: string[] = []): string[] => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === "node_modules") continue;
            walk(full, acc);
        } else if (WALK_EXT.has(path.extname(entry.name))) {
            acc.push(full);
        }
    }
    return acc;
};

describe("no-purple guard — ADR-013", () => {
    it("src/ does not contain any retired purple tokens", () => {
        const files = walk(ROOT);
        const offenders: Array<{ file: string; token: string; line: number }> = [];
        for (const file of files) {
            const text = fs.readFileSync(file, "utf8");
            const lines = text.split("\n");
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].toLowerCase();
                for (const token of BANNED) {
                    if (line.includes(token)) {
                        offenders.push({file, token, line: i + 1});
                    }
                }
            }
        }
        if (offenders.length > 0) {
            const report = offenders
                .map((o) => `  ${o.file}:${o.line} ${o.token}`)
                .join("\n");
            throw new Error(
                `ADR-013 purple retirement violated — found ${offenders.length} occurrence(s):\n${report}`,
            );
        }
        expect(offenders).toHaveLength(0);
    });
});
