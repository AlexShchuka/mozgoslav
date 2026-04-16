import { applyMiddleware, createStore, type Store } from "redux";
import createSagaMiddleware, { type SagaMiddleware } from "redux-saga";
import { rootReducer, type GlobalState } from "./rootReducer";
import { rootSaga } from "./rootSaga";

export type { GlobalState } from "./rootReducer";

export interface ConfiguredStore {
  store: Store<GlobalState>;
  sagaMiddleware: SagaMiddleware;
}

export const configureAppStore = (): ConfiguredStore => {
  const sagaMiddleware = createSagaMiddleware();
  const store = createStore(rootReducer, applyMiddleware(sagaMiddleware));
  sagaMiddleware.run(rootSaga);
  return { store, sagaMiddleware };
};
