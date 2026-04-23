import {folderFromVaultPath} from "../folder";

describe("folderFromVaultPath", () => {
    it("returns null for null path", () => {
        expect(folderFromVaultPath(null, "/vault")).toBeNull();
    });

    it("strips the vault root prefix and returns the parent dir", () => {
        expect(folderFromVaultPath("/vault/Projects/a.md", "/vault")).toBe("Projects");
    });

    it("supports nested folders", () => {
        expect(
            folderFromVaultPath("/vault/Projects/Client/a.md", "/vault"),
        ).toBe("Projects/Client");
    });

    it("returns null for files sitting at the vault root", () => {
        expect(folderFromVaultPath("/vault/a.md", "/vault")).toBeNull();
    });

    it("works without a configured vault root", () => {
        expect(folderFromVaultPath("Projects/a.md", "")).toBe("Projects");
    });

    it("normalizes Windows-style backslashes", () => {
        expect(
            folderFromVaultPath("C:\\vault\\Projects\\a.md", "C:\\vault"),
        ).toBe("Projects");
    });

    it("returns null if vault root does not match prefix (defensive)", () => {
        expect(folderFromVaultPath("/other/root/Archive/a.md", "/vault")).toBe(
            "other/root/Archive",
        );
    });
});
