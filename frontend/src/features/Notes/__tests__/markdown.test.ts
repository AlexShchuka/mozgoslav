import {stripFrontmatter} from "../markdown";

describe("stripFrontmatter", () => {
    it("removes a standard YAML frontmatter block and leaves the body intact", () => {
        const md = [
            "---",
            "type: conversation",
            "tags: [a, b]",
            "---",
            "",
            "## Body",
            "hello",
        ].join("\n");
        expect(stripFrontmatter(md)).toBe("## Body\nhello");
    });

    it("returns the input unchanged when no frontmatter is present", () => {
        const md = "## Body\nhello";
        expect(stripFrontmatter(md)).toBe(md);
    });

    it("does not strip a second `---` block later in the document", () => {
        const md = [
            "---",
            "title: t",
            "---",
            "",
            "body before hr",
            "",
            "---",
            "",
            "body after hr",
        ].join("\n");
        expect(stripFrontmatter(md)).toContain("body before hr");
        expect(stripFrontmatter(md)).toContain("---");
        expect(stripFrontmatter(md)).toContain("body after hr");
    });

    it("tolerates trailing whitespace on delimiters", () => {
        const md = "---  \ntype: c\n---   \nbody";
        expect(stripFrontmatter(md).trim()).toBe("body");
    });
});
