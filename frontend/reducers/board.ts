import { parse as uuidParse, v4 as uuidv4 } from 'uuid';

import { IBoardState } from '@/types';


export const initialBoardState: IBoardState = {
  board: undefined,
  isReadingHttp: false,
  isReadingWs: true,
  isSending: false,
  wsCommand: '',
  wsParams: {},
  boardForm: undefined,
  boardModal: undefined,
  boardOptionsOn: false,
  columnForm: undefined,
  columnMenu: undefined,
  columnMove: undefined,
  displayNameForm: undefined,
  inviteFormOn: false,
  msgFormWillClear: false,
  roleForm: undefined,
  taskForm: undefined,
  userRole: undefined,
  willLoginFromDemo: false,
};

export const boardReducer = (
  state: IBoardState = initialBoardState,
  action: any,
  ): IBoardState => {
    switch (action.type) {
      case 'SET_USER_ROLE':
        return { ...state, userRole: action.userRole };

      case 'SET_DEMO_BOARD':
        return {
          ...initialBoardState,
          board: {
            board_slug: 'board_demo',
            board_title: 'New kanban board',
            activity_logs: [],
            columns: [], // to-do, doing, done?
            memberships: [],
            messages: [],
            tasks: [], // first task?
            created_at: '',
            updated_at: '',
            messages_allowed: false,
            new_members_allowed: false,
          },
          isReadingWs: false,
        };

      case 'START_HTTP_READ_BOARD':
        return { ...state, isReadingHttp: true };

      case 'STOP_HTTP_READ_BOARD':
        return { ...state, isReadingHttp: false };

      case 'SUCCESS_HTTP_READ_BOARD':
        return { ...state, board: action.board, isReadingHttp: false };

      case 'START_WS_READ_BOARD':
        return { ...state, isReadingWs: true };

      case 'STOP_WS_READ_BOARD':
        return { ...state, isReadingWs: false };

      case 'SUCCESS_WS_READ_BOARD':
        return { ...state, board: action.board, isReadingWs: false };

      case 'SUCCESS_CREATE_MSG':
        if (state.board) {
          return {
            ...state,
            board: {
              ...state.board,
              messages: [...state.board.messages, action.message],
            },
          };
        } else return state;
                    
    case 'SUCCESS_SAVE_COLUMNS':
      if (action.columns && state.board) {
        return {
          ...state,
          board: { ...state.board, columns: [...action.columns] },
        };
      } else return state;

    case 'SUCCESS_SAVE_MEMBERS':
      if (action.memberships && state.board) {
        return {
          ...state,
          board: { ...state.board, memberships: [...action.memberships] },
        };
      } else return state;

    case 'SUCCESS_SAVE_TASKS':
      if (action.tasks && state.board) {
        return {
          ...state,
          board: { ...state.board, tasks: [...action.tasks] },
        };
      } else return state;

    case 'BOARD_FORM_SHOW':
      if (state.board) {
        return {
          ...state,
          boardOptionsOn: false,
          columnForm: undefined,
          columnMenu: undefined,
          columnMove: undefined,
          displayNameForm: undefined,
          inviteFormOn: false,
          roleForm: undefined,
          taskForm: undefined,
          boardForm: { board_title: state.board.board_title },
        };
      } else return state;

    case 'BOARD_FORM_CLOSE':
      return { ...state, boardForm: undefined };

    case 'BOARD_FORM_INPUT':
      return { ...state, boardForm: { board_title: action.board_title } };

    case 'BOARD_FORM_SUBMIT':
      if (state.board && state.boardForm) {
        return {
          ...state,
          board: {
            ...state.board,
            board_title: state.boardForm.board_title,
          },
          boardForm: undefined,
        };
      } else return state;

    case 'BOARD_OPTIONS_SHOW':
      if (state.board) {
        return {
          ...state,
          boardForm: undefined,
          columnForm: undefined,
          columnMenu: undefined,
          columnMove: undefined,
          taskForm: undefined,
          boardOptionsOn: true,
        };
      } else return state;

    case 'BOARD_OPTIONS_CLOSE':
      return {
        ...state,
        boardOptionsOn: false,
        displayNameForm: undefined,
        inviteFormOn: false,
        roleForm: undefined,
      };

    case 'COLUMN_FORM_SHOW':
      return {
        ...state,
        boardForm: undefined,
        boardOptionsOn: false,
        columnMenu: undefined,
        columnMove: undefined,
        displayNameForm: undefined,
        inviteFormOn: false,
        roleForm: undefined,
        taskForm: undefined,
        columnForm: { ...action.columnForm },
      };

    case 'COLUMN_FORM_CLOSE':
      return { ...state, columnForm: undefined };

    case 'COLUMN_FORM_INPUT':
      if (state.columnForm) {
        return {
          ...state,
          columnForm: { ...state.columnForm, [action.name]: action.value },
        };
      } else return state;

    case 'COLUMN_FORM_SUBMIT':
      if (state.board && state.columnForm) {
        return {
          ...state,
          board: {
            ...state.board,
            columns: [
              ...state.board.columns,
              {
                board: 'board_demo',
                column_id: crypto.getRandomValues(new Uint32Array(1))[0],
                column_title: state.columnForm.column_title,
                column_index: state.board.columns.length,
                wip_limit_on: state.columnForm.wip_limit_on,
                wip_limit: state.columnForm.wip_limit,
                updated_at: '',
              },
            ],
          },
          columnForm: undefined,
        };
      } else return state;

    case 'COLUMN_MENU_SHOW':
      return {
        ...state,
        boardForm: undefined,
        boardOptionsOn: false,
        columnForm: undefined,
        columnMove: undefined,
        displayNameForm: undefined,
        inviteFormOn: false,
        roleForm: undefined,
        taskForm: undefined,
        columnMenu: { ...action.columnMenu },
      };

    case 'COLUMN_MENU_CLOSE':
      return { ...state, columnMenu: undefined };

    case 'COLUMN_MENU_INPUT':
      if (state.columnMenu) {
        return {
          ...state,
          columnMenu: { ...state.columnMenu, [action.name]: action.value },
        };
      } else return state;

    case 'INVITE_FORM_SHOW':
      return {
        ...state,
        boardForm: undefined,
        columnForm: undefined,
        columnMenu: undefined,
        columnMove: undefined,
        displayNameForm: undefined,
        roleForm: undefined,
        taskForm: undefined,
        inviteFormOn: true,
      };

    case 'INVITE_FORM_CLOSE':
      return { ...state, inviteFormOn: false };

    case 'DISPLAY_NAME_FORM_SHOW':
      return {
        ...state,
        boardForm: undefined,
        columnForm: undefined,
        columnMenu: undefined,
        columnMove: undefined,
        inviteFormOn: false,
        roleForm: undefined,
        taskForm: undefined,
        displayNameForm: { ...action.displayNameForm },
      };

    case 'ROLE_FORM_SHOW':
      return {
        ...state,
        boardForm: undefined,
        columnForm: undefined,
        columnMenu: undefined,
        columnMove: undefined,
        displayNameForm: undefined,
        inviteFormOn: false,
        taskForm: undefined,
        roleForm: { ...action.roleForm },
      };
    
    case 'DISPLAY_NAME_FORM_INPUT':
      if (state.displayNameForm) {
        return {
          ...state,
          displayNameForm: {
            ...state.displayNameForm,
            display_name: action.display_name,
          },
        };
      } else return state;

    case 'ROLE_FORM_INPUT':
      if (state.roleForm) {
        return {
          ...state,
          roleForm: {
            ...state.roleForm,
            role: action.role,
          },
        };
      } else return state;

    case 'MEMBER_FORM_CLOSE':
      return { ...state, displayNameForm: undefined, roleForm: undefined };

    case 'MSG_FORM_CLEAR':
      return { ...state, msgFormWillClear: true };
    
    case 'MSG_FORM_RESET':
      return { ...state, msgFormWillClear: false };

    case 'MSG_INFO_APPEND':
      if (state.board) {
        const messages = state.board.messages.map(msg => {
          if (msg.msg_id === action?.msg?.msg_id) {
            return action.msg;
          }
          return msg;
        });

        return { ...state, board: { ...state.board, messages } };
      } else return state;

    case 'TASK_FORM_SHOW':
      return {
        ...state,
        boardForm: undefined,
        boardOptionsOn: false,
        columnForm: undefined,
        columnMenu: undefined,
        columnMove: undefined,
        displayNameForm: undefined,
        inviteFormOn: false,
        roleForm: undefined,
        taskForm: { ...action.taskForm },
      };

    case 'TASK_FORM_CLOSE':
      return { ...state, taskForm: undefined };

    case 'TASK_FORM_INPUT':
      if (state.taskForm) {
        return {
          ...state,
          taskForm: { ...state.taskForm, text: action.text },
        };
      } else return state;

    case 'BOARD_MODAL_SHOW':
      return { ...state, boardModal: { ...action.boardModal } };

    case 'BOARD_MODAL_CLOSE':
      return { ...state, boardModal: undefined };

    case 'START_WS_COMMAND':
      return { 
        ...state,
        isSending: true,
        wsCommand: action.wsCommand,
        wsParams: { ...action.wsParams },
      };

    case 'STOP_WS_COMMAND':
      return {
        ...state,
        isSending: false,
        wsCommand: '',
        wsParams: {},
      };

    case 'LOGIN_FROM_DEMO':
      return { ...state, willLoginFromDemo: true };

    case 'BOARD_RESET':
      return { ...initialBoardState };

    default:
      return state;
  }
};