import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import "../../../i18n";
import { renderWithStore } from "../../../testUtils";
import { mergeMockState, mockWebSearchState } from "../../../testUtils/mockState";
import {
  LOAD_WEB_SEARCH_CONFIG,
  SAVE_WEB_SEARCH_CONFIG,
} from "../../../store/slices/webSearch/actions";
import WebSearchSettings from "../WebSearchSettings";
import WebSearchSettingsContainer from "../WebSearchSettings.container";
import type { WebSearchConfig } from "../../../store/slices/webSearch/types";

const buildConfig = (patch: Partial<WebSearchConfig> = {}): WebSearchConfig => ({
  ddgEnabled: patch.ddgEnabled ?? true,
  yandexEnabled: patch.yandexEnabled ?? true,
  googleEnabled: patch.googleEnabled ?? false,
  cacheTtlHours: patch.cacheTtlHours ?? 24,
  rawSettingsYaml: patch.rawSettingsYaml ?? "use_default_settings: true",
});

const noop = () => undefined;

describe("WebSearchSettings", () => {
  it("calls onLoad on mount", () => {
    const onLoad = jest.fn();
    renderWithStore(
      <WebSearchSettings
        config={null}
        isLoading={false}
        isSaving={false}
        onLoad={onLoad}
        onSave={noop}
      />
    );
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it("renders engine checkboxes with current state", () => {
    const config = buildConfig({ ddgEnabled: true, yandexEnabled: false, googleEnabled: true });
    renderWithStore(
      <WebSearchSettings
        config={config}
        isLoading={false}
        isSaving={false}
        onLoad={noop}
        onSave={noop}
      />
    );
    expect(screen.getByTestId<HTMLInputElement>("websearch-ddg").checked).toBe(true);
    expect(screen.getByTestId<HTMLInputElement>("websearch-yandex").checked).toBe(false);
    expect(screen.getByTestId<HTMLInputElement>("websearch-google").checked).toBe(true);
  });

  it("calls onSave with toggled engine when Save clicked", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    const config = buildConfig({ ddgEnabled: true, yandexEnabled: true, googleEnabled: false });

    renderWithStore(
      <WebSearchSettings
        config={config}
        isLoading={false}
        isSaving={false}
        onLoad={noop}
        onSave={onSave}
      />
    );

    await user.click(screen.getByTestId("websearch-google"));
    await user.click(screen.getByRole("button"));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ googleEnabled: true }));
  });

  it("dispatches LOAD_WEB_SEARCH_CONFIG via container on mount", () => {
    const state = mergeMockState(mockWebSearchState());
    const { getActions } = renderWithStore(<WebSearchSettingsContainer />, {
      preloadedState: state,
    });
    const actions = getActions();
    expect(actions.some((a) => a.type === LOAD_WEB_SEARCH_CONFIG)).toBe(true);
  });

  it("dispatches SAVE_WEB_SEARCH_CONFIG via container when Save clicked", async () => {
    const user = userEvent.setup();
    const config = buildConfig();
    const state = mergeMockState(mockWebSearchState({ config }));
    const { getActions } = renderWithStore(<WebSearchSettingsContainer />, {
      preloadedState: state,
    });

    await user.click(screen.getByRole("button"));

    const actions = getActions();
    expect(actions.some((a) => a.type === SAVE_WEB_SEARCH_CONFIG)).toBe(true);
  });

  it("renders the raw settings yaml block when config has yaml", () => {
    const config = buildConfig({ rawSettingsYaml: "use_default_settings: true\n" });
    renderWithStore(
      <WebSearchSettings
        config={config}
        isLoading={false}
        isSaving={false}
        onLoad={noop}
        onSave={noop}
      />
    );
    expect(screen.getByText(/use_default_settings/)).toBeInTheDocument();
  });
});
