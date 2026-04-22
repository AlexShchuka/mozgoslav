const FRONTMATTER_RE = /^\s*---\s*\n[\s\S]*?\n---\s*\n?/;

export const stripFrontmatter = (markdown: string): string =>
    markdown.replace(FRONTMATTER_RE, "");
