import type { AnyAction } from "redux";

import webSearchReducer, { initialWebSearchState } from "../reducer";
import {
  loadWebSearchConfig,
  loadWebSearchConfigFailure,
  loadWebSearchConfigSuccess,
  saveWebSearchConfig,
  saveWebSearchConfigFailure,
  saveWebSearchConfigSuccess,
} from "../actions";
import type { WebSearchConfig } from "../types";

const buildConfig = (): WebSearchConfig => ({
  ddgEnabled: true,
  yandexEnabled: false,
  googleEnabled: true,
  cacheTtlHours: 24,
  rawSettingsYaml: "use_default_settings: true",
});

const act = (action: unknown): AnyAction => action as AnyAction;

describe("webSearchReducer", () => {
  it("sets isLoading on LOAD_WEB_SEARCH_CONFIG", () => {
    const state = webSearchReducer(undefined, act(loadWebSearchConfig()));
    expect(state.isLoading).toBe(true);
  });

  it("sets config and clears isLoading on LOAD_WEB_SEARCH_CONFIG_SUCCESS", () => {
    const config = buildConfig();
    const state = webSearchReducer(
      { ...initialWebSearchState, isLoading: true },
      act(loadWebSearchConfigSuccess(config))
    );
    expect(state.isLoading).toBe(false);
    expect(state.config).toEqual(config);
  });

  it("clears isLoading on LOAD_WEB_SEARCH_CONFIG_FAILURE", () => {
    const state = webSearchReducer(
      { ...initialWebSearchState, isLoading: true },
      act(loadWebSearchConfigFailure())
    );
    expect(state.isLoading).toBe(false);
    expect(state.config).toBeNull();
  });

  it("sets isSaving on SAVE_WEB_SEARCH_CONFIG", () => {
    const state = webSearchReducer(undefined, act(saveWebSearchConfig(buildConfig())));
    expect(state.isSaving).toBe(true);
  });

  it("sets config and clears isSaving on SAVE_WEB_SEARCH_CONFIG_SUCCESS", () => {
    const config = buildConfig();
    const state = webSearchReducer(
      { ...initialWebSearchState, isSaving: true },
      act(saveWebSearchConfigSuccess(config))
    );
    expect(state.isSaving).toBe(false);
    expect(state.config).toEqual(config);
  });

  it("clears isSaving on SAVE_WEB_SEARCH_CONFIG_FAILURE", () => {
    const state = webSearchReducer(
      { ...initialWebSearchState, isSaving: true },
      act(saveWebSearchConfigFailure())
    );
    expect(state.isSaving).toBe(false);
  });
});
