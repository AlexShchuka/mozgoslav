import { FC, forwardRef } from "react";
import { useTranslation } from "react-i18next";
import type { ActionImpl } from "kbar";
import {
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarResults,
  KBarSearch,
  useMatches,
} from "kbar";

import {
  Backdrop,
  Chip,
  FooterHint,
  Input,
  Item,
  ItemHint,
  ItemList,
  Palette,
  Section,
  SectionHeader,
} from "./CommandPalette.style";

const RenderItem = forwardRef<HTMLButtonElement, { item: ActionImpl | string; active: boolean }>(
  ({ item, active }, ref) => {
    if (typeof item === "string") {
      return <SectionHeader data-testid="kbar-section">{item}</SectionHeader>;
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
        {item.shortcut?.length ? <ItemHint>{item.shortcut.join(" ")}</ItemHint> : null}
      </Item>
    );
  }
);
RenderItem.displayName = "CommandPalette.RenderItem";

const Results: FC = () => {
  const { results } = useMatches();
  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) => <RenderItem item={item} active={active} />}
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
              <FooterHint data-testid="kbar-footer">
                <Chip>↑</Chip>
                <Chip>↓</Chip>
                <span>{t("commandPalette.hint.navigate")}</span>
                <Chip>↵</Chip>
                <span>{t("commandPalette.hint.select")}</span>
                <Chip>Esc</Chip>
                <span>{t("commandPalette.hint.dismiss")}</span>
              </FooterHint>
            </Palette>
          </KBarAnimator>
        </Backdrop>
      </KBarPositioner>
    </KBarPortal>
  );
};

export default CommandPalette;
