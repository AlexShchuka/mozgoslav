export const folderFromVaultPath = (
    vaultPath: string | null,
    vaultRoot: string,
): string | null => {
    if (!vaultPath) return null;

    const normalizedPath = vaultPath.replace(/\\/g, "/");
    const normalizedRoot = vaultRoot.replace(/\\/g, "/");

    let relative = normalizedPath;
    if (normalizedRoot && relative.startsWith(normalizedRoot)) {
        relative = relative.slice(normalizedRoot.length);
    }
    relative = relative.replace(/^\/+/, "");

    const lastSlash = relative.lastIndexOf("/");
    if (lastSlash <= 0) return null;
    return relative.slice(0, lastSlash);
};
