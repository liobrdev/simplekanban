import { IUserState } from '@/types';


export const initialUserState: IUserState = {
  clientIp: undefined,
  isLoggingIn: false,
  isLoggingOut: false,
  isRegistering: false,
  isUpdating: false,
  isDeleting: false,
  user: undefined,
};

export const userReducer = (
  state: IUserState = initialUserState,
  action: any,
): IUserState => {
  switch (action.type) {
    case 'START_LOGIN_USER':
      return {
        ...state,
        isLoggingIn: true,
      };

    case 'STOP_LOGIN_USER':
      return {
        ...state,
        isLoggingIn: false,
      };

    case 'SUCCESS_LOGIN_USER':
      return {
        ...state,
        isLoggingIn: false,
        user: action.data,
      };

    case 'START_LOGOUT_USER':
      return {
        ...state,
        isLoggingOut: true,
      };

    case 'STOP_LOGOUT_USER':
      return {
        ...state,
        isLoggingOut: false,
      };

    case 'SUCCESS_LOGOUT_USER':
      return {
        ...state,
        isLoggingOut: false,
        user: undefined,
      };

    case 'START_REGISTER_USER':
      return {
        ...state,
        isRegistering: true,
      };

    case 'STOP_REGISTER_USER':
      return {
        ...state,
        isRegistering: false,
      };

    case 'SUCCESS_REGISTER_USER':
      return {
        ...state,
        isRegistering: false,
        user: action.data,
      };

    case 'START_UPDATE_USER':
      return {
        ...state,
        isUpdating: true,
      };

    case 'STOP_UPDATE_USER':
      return {
        ...state,
        isUpdating: false,
      };

    case 'SUCCESS_UPDATE_USER':
      return {
        ...state,
        isUpdating: false,
        user: action.data,
      };

    case 'START_DELETE_USER':
      return {
        ...state,
        isDeleting: true,
      };

    case 'STOP_DELETE_USER':
      return {
        ...state,
        isDeleting: false,
      };

    case 'SUCCESS_DELETE_USER':
      return {
        ...state,
        isDeleting: false,
        user: undefined,
      };

    case 'SET_USER':
      return {
        ...state,
        clientIp: action.data?.clientIp,
        user: action.data?.user,
      };

    default:
      return { ...state };
  }
};