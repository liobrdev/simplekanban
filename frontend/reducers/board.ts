import { IBoardState } from '@/types';
import { deleteColumn, moveColumn, deleteTask } from '@/utils';


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
  toLoginFromDemo: false,
  isSubmittingDemo: false,
  taskScrollIntoView: '',
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
            board_slug: 'demo',
            board_title: 'New kanban board',
            activity_logs: [],
            columns: [{
              board: 'demo',
              column_id: 1234567890,
              column_title: 'To do',
              column_index: 0,
              wip_limit_on: true,
              wip_limit: 5,
              updated_at: '',
            }, {
              board: 'demo',
              column_id: crypto.getRandomValues(new Uint32Array(1))[0],
              column_title: 'Doing',
              column_index: 1,
              wip_limit_on: true,
              wip_limit: 3,
              updated_at: '',
            }, {
              board: 'demo',
              column_id: crypto.getRandomValues(new Uint32Array(1))[0],
              column_title: 'Done',
              column_index: 2,
              wip_limit_on: false,
              wip_limit: 5,
              updated_at: '',
            }],
            memberships: [],
            messages: [],
            tasks: [{
              board: 'demo',
              column: 1234567890,
              task_id: crypto.getRandomValues(new Uint32Array(1))[0],
              task_index: 0,
              text: 'First task - edit, move, or delete!',
              updated_at: '',
            }],
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

    case 'COLUMN_MENU_SUBMIT':
      if (state.board && state.columnMenu) {
        const columns = [...state.board.columns];

        for (let i = 0; i < columns.length; i++) {
          if (columns[i].column_id === state.columnMenu.column_id) {
            columns[i].wip_limit_on = state.columnMenu.wip_limit_on;
            columns[i].wip_limit = state.columnMenu.wip_limit;
            break;
          }
        }

        return {
          ...state,
          board: { ...state.board, columns },
          columnForm: undefined,
          columnMenu: undefined,
        };
      } else return state;

    case 'COLUMN_CREATE':
      if (state.board && state.columnForm) {
        return {
          ...state,
          board: {
            ...state.board,
            columns: [
              ...state.board.columns,
              {
                board: 'demo',
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

    case 'COLUMN_TITLE_UPDATE':
      if (state.board && typeof state.columnForm?.column_id === 'number') {
        const columns = [...state.board.columns];

        for (let i = 0; i < columns.length; i++) {
          if (columns[i].column_id === state.columnForm.column_id) {
            columns[i].column_title = state.columnForm.column_title;
            break;
          }
        }

        return {
          ...state,
          board: { ...state.board, columns },
          columnForm: undefined,
          columnMenu: undefined,
        };
      } else return state;

    case 'COLUMN_MOVE':
      if (
        state.board
        && typeof action?.columnId === 'number'
        && typeof action?.oldIndex === 'number'
        && typeof action?.newIndex === 'number'
      ) {
        const { columnId, oldIndex, newIndex } = action;
        const columns =
          moveColumn(columnId, oldIndex, newIndex, [...state.board.columns]);

        return {
          ...state,
          board: { ...state.board, columns },
          columnMenu: undefined,
        };
      } else return state;

    case 'COLUMN_DELETE':
      if (
        state.board && state.columnMenu
        && typeof action?.column_index === 'number'
      ) {
        const columns =
          deleteColumn(action.column_index, [...state.board.columns]);
        const { column_id } = state.columnMenu;

        return {
          ...state,
          board: {
            ...state.board,
            columns,
            tasks: state.board.tasks.filter(t => t.column !== column_id),
          },
          boardModal: undefined,
          columnMenu: undefined,
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

    case 'TASK_CREATE':
      if (state.board && state.taskForm) {
        const { column_id, text } = state.taskForm;
        const { tasks } = state.board;

        return {
          ...state,
          board: {
            ...state.board,
            tasks: [...tasks, {
              board: 'demo',
              column: column_id,
              task_id: crypto.getRandomValues(new Uint32Array(1))[0],
              task_index: tasks.filter(t => t.column === column_id).length,
              text,
              updated_at: '',
            }],
          },
          taskForm: undefined,
        };
      } else return state;

    case 'TASK_UPDATE':
      if (state.board && typeof state.taskForm?.task_id === 'number') {
        const tasks = [...state.board.tasks];

        for (let i = 0; i < tasks.length; i++) {
          if (tasks[i].task_id === state.taskForm.task_id) {
            tasks[i].text = state.taskForm.text;
            break;
          }
        }

        return {
          ...state,
          board: { ...state.board, tasks },
          taskForm: undefined,
        };
      } else return state;

    case 'TASK_DELETE':
      if (
        state.board
        && typeof action?.column_id === 'number'
        && typeof action?.task_index === 'number'
      ) {
        const { column_id, task_index } = action;
        const tasks =
          deleteTask(column_id, task_index, [...state.board.tasks]);

        return {
          ...state,
          board: { ...state.board, tasks },
          taskForm: undefined,
        };
      } else return state;

    case 'TASK_SCROLL_INTO_VIEW':
      return { ...state, taskScrollIntoView: '' + action.task_id };

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

    case 'TO_LOGIN_FROM_DEMO':
      return { ...state, toLoginFromDemo: action.value };

    case 'START_SUBMIT_DEMO':
      return { ...state, isSubmittingDemo: true };

    case 'STOP_SUBMIT_DEMO':
      return { ...state, isSubmittingDemo: false };

    case 'BOARD_RESET':
      return { ...initialBoardState };

    default:
      return state;
  }
};