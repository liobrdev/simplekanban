import { combineReducers } from 'redux';

import { accountReducer, initialAccountState } from './account';
import { boardReducer, initialBoardState } from './board';
import { dashboardReducer, initialDashboardState } from './dashboard';
import { userReducer, initialUserState } from './user';


const reducers = {
  account: accountReducer,
  board: boardReducer,
  dashboard: dashboardReducer,
  user: userReducer,
};

export const initialAppState = {
  account: initialAccountState,
  board: initialBoardState,
  dashboard: initialDashboardState,
  user: initialUserState,
};

export default combineReducers(reducers);