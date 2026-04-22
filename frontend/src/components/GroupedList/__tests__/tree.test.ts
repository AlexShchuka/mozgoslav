import {buildTree, hasAnyGroup} from "../tree";

interface Item {
    id: string;
    path: string | null;
}

const at = (path: string | null, id: string): Item => ({id, path});

describe("buildTree", () => {
    it("puts items with null path into root", () => {
        const tree = buildTree([at(null, "a"), at(null, "b")], (i) => i.path);
        expect(tree.items.map((i) => i.id)).toEqual(["a", "b"]);
        expect(tree.children).toHaveLength(0);
        expect(hasAnyGroup(tree)).toBe(false);
    });

    it("groups items by single-segment path", () => {
        const tree = buildTree(
            [at("Projects", "a"), at("Archive", "b"), at("Projects", "c")],
            (i) => i.path,
        );
        expect(tree.items).toHaveLength(0);
        expect(tree.children).toHaveLength(2);
        const names = tree.children.map((c) => c.name).sort();
        expect(names).toEqual(["Archive", "Projects"]);
        const projects = tree.children.find((c) => c.name === "Projects")!;
        expect(projects.items.map((i) => i.id)).toEqual(["a", "c"]);
    });

    it("creates nested structure for slash-separated paths", () => {
        const tree = buildTree(
            [at("Projects/Client", "a"), at("Projects/Personal", "b")],
            (i) => i.path,
        );
        expect(tree.children).toHaveLength(1);
        const projects = tree.children[0]!;
        expect(projects.name).toBe("Projects");
        expect(projects.items).toHaveLength(0);
        expect(projects.children).toHaveLength(2);
        const childNames = projects.children.map((c) => c.name).sort();
        expect(childNames).toEqual(["Client", "Personal"]);
    });

    it("trims empty segments and treats empty path as ungrouped", () => {
        const tree = buildTree(
            [at("", "a"), at("//Projects//", "b"), at("   ", "c")],
            (i) => i.path,
        );
        expect(tree.items.map((i) => i.id).sort()).toEqual(["a", "c"]);
        const projects = tree.children.find((c) => c.name === "Projects")!;
        expect(projects.items.map((i) => i.id)).toEqual(["b"]);
    });

    it("sorts children alphabetically", () => {
        const tree = buildTree(
            [at("Zeta", "a"), at("Alpha", "b"), at("Mu", "c")],
            (i) => i.path,
        );
        expect(tree.children.map((c) => c.name)).toEqual(["Alpha", "Mu", "Zeta"]);
    });
});
