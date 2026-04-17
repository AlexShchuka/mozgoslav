import { FC, forwardRef } from "react";
import { useTranslation } from "react-i18next";
import {
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarResults,
  KBarSearch,
  useMatches,
} from "kbar";
import type { ActionImpl } from "kbar";

import {
  Backdrop,
  Input,
  Item,
  ItemHint,
  ItemList,
  Palette,
  Section,
} from "./CommandPalette.style";

/**
 * CommandPalette — kbar-powered Cmd+K overlay. Actions are registered via
 * `useCommandPaletteActions` from the provider tree in main.tsx; this
 * component only renders the portal + result list.
 *
 * TODO-5 — Cmd+K / Ctrl+K toggle is handled by kbar out-of-the-box
 * (`toggleShortcut` defaults to `$mod+k`).
 */
const RenderItem = forwardRef<
  HTMLButtonElement,
  { item: ActionImpl | string; active: boolean }
>(({ item, active }, ref) => {
  if (typeof item === "string") {
    return (
      <SectionHeader data-testid="kbar-section">{item}</SectionHeader>
    );
  }
  return (
    <Item
      ref={ref}
      type="button"
      $active={active}
      data-testid={`kbar-item-${item.id}`}
      onClick={() => item.command?.perform()}
    >
      <span>{item.name}</span>
      {item.shortcut?.length ? (
        <ItemHint>{item.shortcut.join(" ")}</ItemHint>
      ) : null}
    </Item>
  );
});
RenderItem.displayName = "CommandPalette.RenderItem";

const SectionHeader: FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...rest }) => (
  <div
    {...rest}
    style={{
      padding: "8px 12px",
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      opacity: 0.6,
    }}
  >
    {children}
  </div>
);

const Results: FC = () => {
  const { results } = useMatches();
  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) => (
        <RenderItem item={item} active={active} />
      )}
    />
  );
};

const CommandPalette: FC = () => {
  const { t } = useTranslation();
  return (
    <KBarPortal>
      <KBarPositioner>
        <Backdrop onClick={(e) => e.stopPropagation()}>
          <KBarAnimator>
            <Palette data-testid="kbar-palette">
              <Input
                as={KBarSearch}
                defaultPlaceholder={t("common.search")}
                data-testid="kbar-search"
              />
              <Section>
                <ItemList>
                  <Results />
                </ItemList>
              </Section>
            </Palette>
          </KBarAnimator>
        </Backdrop>
      </KBarPositioner>
    </KBarPortal>
  );
};

export default CommandPalette;
