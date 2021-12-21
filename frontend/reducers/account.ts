import { IAccountState } from '@/types';


export const initialAccountState: IAccountState = {
  formOnDeleteUser: false,
  accountModal: undefined,
};

export const accountReducer = (
  state: IAccountState = initialAccountState, 
  action: any,
): IAccountState => {
  switch (action.type) {
    case 'ACCOUNT_DELETE_FORM_SHOW':
      return {
        ...state,
        formOnDeleteUser: true,
      };

    case 'ACCOUNT_DELETE_FORM_CLOSE':
      return {
        ...state,
        formOnDeleteUser: false,
      };
    
    case 'ACCOUNT_MODAL_SHOW':
      return { ...state, accountModal: { ...action.accountModal } };

    case 'ACCOUNT_MODAL_CLOSE':
      return { ...state, accountModal: undefined };

    case 'ACCOUNT_RESET':
      return initialAccountState;

    default:
      return state;
  }
};