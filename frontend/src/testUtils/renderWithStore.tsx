import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { Provider } from "react-redux";
import { applyMiddleware, createStore, type Middleware, type Store } from "redux";
import type { AnyAction } from "redux";
import type { SagaIterator } from "redux-saga";
import createSagaMiddleware, { type SagaMiddleware } from "redux-saga";
import { all, fork } from "redux-saga/effects";
import { ThemeProvider } from "styled-components";

import { type GlobalState, rootReducer } from "../store/rootReducer";
import { lightTheme } from "../styles/theme";

export type Saga = () => SagaIterator;

export interface RenderWithStoreOptions {
  readonly preloadedState?: Partial<GlobalState>;
  readonly sagas?: readonly Saga[];
  readonly theme?: typeof lightTheme;
  readonly renderOptions?: Omit<RenderOptions, "wrapper">;
}

export interface RenderWithStoreResult extends RenderResult {
  readonly store: Store<GlobalState>;
  readonly sagaMiddleware: SagaMiddleware;
  readonly recordedActions: readonly AnyAction[];
  readonly getActions: () => AnyAction[];
}

export const renderWithStore = (
  ui: ReactElement,
  options: RenderWithStoreOptions = {}
): RenderWithStoreResult => {
  const recorded: AnyAction[] = [];

  const recorderMiddleware: Middleware = () => (next) => (action) => {
    recorded.push(action as AnyAction);
    return next(action);
  };

  const sagaMiddleware = createSagaMiddleware();
  const store = createStore(
    rootReducer,
    options.preloadedState as GlobalState | undefined,
    applyMiddleware(recorderMiddleware, sagaMiddleware)
  );
  if (options.sagas && options.sagas.length > 0) {
    const sagas = options.sagas;

    function* rootSaga(): SagaIterator {
      yield all(sagas.map((s) => fork(s)));
    }

    sagaMiddleware.run(rootSaga);
  }

  const theme = options.theme ?? lightTheme;
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </Provider>
  );

  const result = render(ui, { wrapper: Wrapper, ...options.renderOptions });
  return {
    ...result,
    store,
    sagaMiddleware,
    recordedActions: recorded,
    getActions: () => recorded,
  };
};
