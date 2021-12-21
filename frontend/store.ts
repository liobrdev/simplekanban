import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';

import rootReducer, { initialAppState } from '@/reducers';


export const isServer = !(
  typeof window !== 'undefined' &&
  window.document &&
  window.document.createElement
);

export const store = createStore(
  rootReducer,
  initialAppState,
  composeWithDevTools(applyMiddleware()),
);

export type AppState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;