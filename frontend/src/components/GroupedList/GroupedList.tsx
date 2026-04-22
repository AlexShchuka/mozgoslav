import {type KeyboardEvent, type ReactNode, useMemo, useState} from "react";
import {ChevronRight, Folder, FolderOpen} from "lucide-react";

import {buildTree, hasAnyGroup, type TreeNode} from "./tree";
import {
    ActionsSlot,
    Chevron,
    GroupCount,
    GroupHeader,
    GroupName,
    GroupSection,
    ItemsStack,
    Primary,
    PrimaryLine,
    Root,
    Row,
    SecondaryLine,
} from "./GroupedList.style";

export interface GroupedListProps<T> {
    readonly items: readonly T[];
    readonly getId: (item: T) => string;
    readonly getGroupPath?: (item: T) => string | null;
    readonly renderPrimary: (item: T) => ReactNode;
    readonly renderSecondary?: (item: T) => ReactNode;
    readonly renderActions?: (item: T) => ReactNode;
    readonly onItemClick?: (item: T) => void;
    readonly ungroupedLabel?: string;
    readonly defaultCollapsed?: boolean;
    readonly "data-testid"?: string;
}

const GroupedList = <T,>({
                             items,
                             getId,
                             getGroupPath,
                             renderPrimary,
                             renderSecondary,
                             renderActions,
                             onItemClick,
                             ungroupedLabel,
                             defaultCollapsed = false,
                             "data-testid": testId,
                         }: GroupedListProps<T>) => {
    const tree = useMemo(
        () => buildTree(items, getGroupPath ?? (() => null)),
        [items, getGroupPath],
    );

    const hasGroups = hasAnyGroup(tree);

    if (!hasGroups) {
        return (
            <Root data-testid={testId}>
                <ItemsStack>
                    {tree.items.map((item) => (
                        <ItemRow
                            key={getId(item)}
                            item={item}
                            renderPrimary={renderPrimary}
                            renderSecondary={renderSecondary}
                            renderActions={renderActions}
                            onItemClick={onItemClick}
                        />
                    ))}
                </ItemsStack>
            </Root>
        );
    }

    return (
        <Root data-testid={testId}>
            {tree.items.length > 0 && (
                <UngroupedSection
                    items={tree.items}
                    label={ungroupedLabel ?? "Без папки"}
                    getId={getId}
                    renderPrimary={renderPrimary}
                    renderSecondary={renderSecondary}
                    renderActions={renderActions}
                    onItemClick={onItemClick}
                    defaultCollapsed={defaultCollapsed}
                />
            )}
            {tree.children.map((child) => (
                <BranchSection
                    key={child.path}
                    node={child}
                    depth={0}
                    getId={getId}
                    renderPrimary={renderPrimary}
                    renderSecondary={renderSecondary}
                    renderActions={renderActions}
                    onItemClick={onItemClick}
                    defaultCollapsed={defaultCollapsed}
                />
            ))}
        </Root>
    );
};

interface BranchProps<T> {
    readonly node: TreeNode<T>;
    readonly depth: number;
    readonly getId: (item: T) => string;
    readonly renderPrimary: (item: T) => ReactNode;
    readonly renderSecondary?: (item: T) => ReactNode;
    readonly renderActions?: (item: T) => ReactNode;
    readonly onItemClick?: (item: T) => void;
    readonly defaultCollapsed: boolean;
}

const countDescendantItems = <T, >(node: TreeNode<T>): number => {
    let total = node.items.length;
    for (const child of node.children) total += countDescendantItems(child);
    return total;
};

const BranchSection = <T, >({
                                node,
                                depth,
                                defaultCollapsed,
                                ...rest
                            }: BranchProps<T>) => {
    const [open, setOpen] = useState(!defaultCollapsed);
    const count = useMemo(() => countDescendantItems(node), [node]);

    return (
        <GroupSection $depth={depth}>
            <GroupHeader
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                <Chevron $open={open}>
                    <ChevronRight size={14}/>
                </Chevron>
                {open ? <FolderOpen size={16}/> : <Folder size={16}/>}
                <GroupName>{node.name}</GroupName>
                <GroupCount>{count}</GroupCount>
            </GroupHeader>
            {open && (
                <>
                    {node.items.length > 0 && (
                        <ItemsStack>
                            {node.items.map((item) => (
                                <ItemRow
                                    key={rest.getId(item)}
                                    item={item}
                                    renderPrimary={rest.renderPrimary}
                                    renderSecondary={rest.renderSecondary}
                                    renderActions={rest.renderActions}
                                    onItemClick={rest.onItemClick}
                                />
                            ))}
                        </ItemsStack>
                    )}
                    {node.children.map((child) => (
                        <BranchSection
                            key={child.path}
                            node={child}
                            depth={depth + 1}
                            defaultCollapsed={defaultCollapsed}
                            {...rest}
                        />
                    ))}
                </>
            )}
        </GroupSection>
    );
};

interface UngroupedProps<T> {
    readonly items: readonly T[];
    readonly label: string;
    readonly getId: (item: T) => string;
    readonly renderPrimary: (item: T) => ReactNode;
    readonly renderSecondary?: (item: T) => ReactNode;
    readonly renderActions?: (item: T) => ReactNode;
    readonly onItemClick?: (item: T) => void;
    readonly defaultCollapsed: boolean;
}

const UngroupedSection = <T, >({
                                   items,
                                   label,
                                   getId,
                                   renderPrimary,
                                   renderSecondary,
                                   renderActions,
                                   onItemClick,
                                   defaultCollapsed,
                               }: UngroupedProps<T>) => {
    const [open, setOpen] = useState(!defaultCollapsed);

    return (
        <GroupSection $depth={0}>
            <GroupHeader
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                <Chevron $open={open}>
                    <ChevronRight size={14}/>
                </Chevron>
                {open ? <FolderOpen size={16}/> : <Folder size={16}/>}
                <GroupName>{label}</GroupName>
                <GroupCount>{items.length}</GroupCount>
            </GroupHeader>
            {open && (
                <ItemsStack>
                    {items.map((item) => (
                        <ItemRow
                            key={getId(item)}
                            item={item}
                            renderPrimary={renderPrimary}
                            renderSecondary={renderSecondary}
                            renderActions={renderActions}
                            onItemClick={onItemClick}
                        />
                    ))}
                </ItemsStack>
            )}
        </GroupSection>
    );
};

interface ItemRowProps<T> {
    readonly item: T;
    readonly renderPrimary: (item: T) => ReactNode;
    readonly renderSecondary?: (item: T) => ReactNode;
    readonly renderActions?: (item: T) => ReactNode;
    readonly onItemClick?: (item: T) => void;
}

const ItemRow = <T, >({
                          item,
                          renderPrimary,
                          renderSecondary,
                          renderActions,
                          onItemClick,
                      }: ItemRowProps<T>) => {
    const clickable = Boolean(onItemClick);
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!clickable) return;
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onItemClick?.(item);
        }
    };

    return (
        <Row
            $clickable={clickable}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? () => onItemClick?.(item) : undefined}
            onKeyDown={onKeyDown}
        >
            <Primary>
                <PrimaryLine>{renderPrimary(item)}</PrimaryLine>
                {renderSecondary && <SecondaryLine>{renderSecondary(item)}</SecondaryLine>}
            </Primary>
            {renderActions && (
                <ActionsSlot onClick={(event) => event.stopPropagation()}>
                    {renderActions(item)}
                </ActionsSlot>
            )}
        </Row>
    );
};

export default GroupedList;
