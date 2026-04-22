export interface TreeNode<T> {
    readonly name: string;
    readonly path: string;
    readonly children: ReadonlyArray<TreeNode<T>>;
    readonly items: ReadonlyArray<T>;
}

const ROOT_PATH = "";

interface MutableNode<T> {
    name: string;
    path: string;
    children: Map<string, MutableNode<T>>;
    items: T[];
}

const createNode = <T>(name: string, path: string): MutableNode<T> => ({
    name,
    path,
    children: new Map(),
    items: [],
});

const freeze = <T>(node: MutableNode<T>): TreeNode<T> => ({
    name: node.name,
    path: node.path,
    items: node.items,
    children: [...node.children.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(freeze),
});

export const buildTree = <T>(
    items: readonly T[],
    getGroupPath: (item: T) => string | null,
): TreeNode<T> => {
    const root = createNode<T>("", ROOT_PATH);

    for (const item of items) {
        const raw = getGroupPath(item);
        const segments = normalizePath(raw);

        if (segments.length === 0) {
            root.items.push(item);
            continue;
        }

        let cursor = root;
        let path = ROOT_PATH;
        for (const segment of segments) {
            path = path === ROOT_PATH ? segment : `${path}/${segment}`;
            let child = cursor.children.get(segment);
            if (!child) {
                child = createNode<T>(segment, path);
                cursor.children.set(segment, child);
            }
            cursor = child;
        }
        cursor.items.push(item);
    }

    return freeze(root);
};

export const hasAnyGroup = <T>(tree: TreeNode<T>): boolean => tree.children.length > 0;

const normalizePath = (raw: string | null): string[] => {
    if (!raw) return [];
    return raw
        .split("/")
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0);
};
