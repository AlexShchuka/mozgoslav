import { applyMiddleware, createStore } from "redux";
import createSagaMiddleware, { type SagaMiddleware } from "redux-saga";
import { rootReducer } from "./rootReducer";
import { rootSaga } from "./rootSaga";

export type { GlobalState } from "./rootReducer";

export interface ConfiguredStore {
  store: ReturnType<typeof createAppStore>["store"];
  sagaMiddleware: SagaMiddleware;
}

const createAppStore = () => {
  const sagaMiddleware = createSagaMiddleware();
  const store = createStore(rootReducer, applyMiddleware(sagaMiddleware));
  return { store, sagaMiddleware };
};

export const configureAppStore = (): ConfiguredStore => {
  const { store, sagaMiddleware } = createAppStore();
  sagaMiddleware.run(rootSaga);
  return { store, sagaMiddleware };
};
