import type { ApiFactory } from "../api";
import type { ObsidianApi } from "../api/ObsidianApi";

export interface MockApiBundle {
  readonly factory: ApiFactory;
  readonly obsidianApi: {
    setup: jest.Mock;
    bulkExport: jest.Mock;
    applyLayout: jest.Mock;
    detect: jest.Mock;
    restHealth: jest.Mock;
    diagnostics: jest.Mock;
    reapplyBootstrap: jest.Mock;
    reinstallPlugins: jest.Mock;
  };
}

const jestFn = <T = unknown>(): jest.Mock => jest.fn<Promise<T>, unknown[]>();

export const createMockApi = (): MockApiBundle => {
  const obsidianApi = {
    setup: jestFn(),
    bulkExport: jestFn(),
    applyLayout: jestFn(),
    detect: jestFn(),
    restHealth: jestFn(),
    diagnostics: jestFn(),
    reapplyBootstrap: jestFn(),
    reinstallPlugins: jestFn(),
  } as unknown as ObsidianApi;

  const factory: ApiFactory = {
    createObsidianApi: () => obsidianApi,
  };

  return {
    factory,
    obsidianApi: obsidianApi as unknown as MockApiBundle["obsidianApi"],
  };
};
