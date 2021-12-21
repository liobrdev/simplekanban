import { IDashboardState } from '@/types';


export const initialDashboardState: IDashboardState = {
  boards: [],
  errorRetrieve: undefined,
  isRetrieving: false,
  isCreating: false,
  formOnCreateBoard: false,
  menuOn: false,
  searchBarOn: false,
};

export const dashboardReducer = (
  state: IDashboardState = initialDashboardState, 
  action: any,
): IDashboardState => {
  switch (action.type) {
    case 'START_RETRIEVE_BOARDS':
      return {
        ...state,
        isRetrieving: true,
      };

    case 'STOP_RETRIEVE_BOARDS':
      return {
        ...state,
        isRetrieving: false,
      };

    case 'START_CREATE_BOARD':
      return {
        ...state,
        isCreating: true,
      };

    case 'STOP_CREATE_BOARD':
      return {
        ...state,
        isCreating: false,
      };

    case 'SUCCESS_CREATE_BOARD':
      return {
        ...state,
        boards: [action.board, ...state.boards],
        formOnCreateBoard: false,
        isCreating: false,
      };

    case 'DASHBOARD_FORM_SHOW':
      return {
        ...state,
        formOnCreateBoard: true,
        menuOn: false,
        searchBarOn: false,
      };

    case 'DASHBOARD_FORM_CLOSE':
      return {
        ...state,
        formOnCreateBoard: false,
      };

    case 'DASHBOARD_MENU_SHOW':
      return {
        ...state,
        formOnCreateBoard: false,
        menuOn: true,
        searchBarOn: false,
      };

    case 'DASHBOARD_MENU_CLOSE':
      return {
        ...state,
        menuOn: false,
      };

    case 'DASHBOARD_SEARCHBAR_SHOW':
      return {
        ...state,
        formOnCreateBoard: false,
        menuOn: false,
        searchBarOn: true,
      };

    case 'DASHBOARD_SEARCHBAR_CLOSE':
      return {
        ...state,
        searchBarOn: false,
      };

    case 'DASHBOARD_SET_BOARDS':
      return {
        ...state,
        boards: action.data,
        errorRetrieve: action.error,
      };

    case 'DASHBOARD_RESET':
      return initialDashboardState;

    default:
      return state;
  }
};