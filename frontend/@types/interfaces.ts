// Misc
export interface IAction {
  type: string;
  [key: string]: any;
}

export interface IActivityLog {
  board: string;
  task: number | null;
  command?: string | null;
  msg: string;
  created_at: string;
}

export interface IBoardDetail extends IBoardThumb {
  activity_logs: IActivityLog[];
  columns: IColumn[];
  memberships: IMembership[];
  messages: IMessage[];
  tasks: ITask[];
  created_at: string;
  updated_at: string;
  messages_allowed: boolean;
  new_members_allowed: boolean;
}

export interface IBoardForm {
  board_title: string;
}

export interface IBoardThumb {
  board_slug: string;
  board_title: string;
}

export interface IBreadcrumbListItem {
  '@type': string;
  position: number;
  name: string;
  item: string;
}

export interface IButton {
  action: IAction;
  text?: string;
}

export interface IColumn {
  board: string;
  column_id: number;
  column_title: string;
  column_index: number;
  wip_limit_on: boolean;
  wip_limit: number;
  updated_at: string;
}

export interface IColumnForm {
  column_id?: number;
  column_title: string;
  wip_limit_on: boolean;
  wip_limit: number;
}

export interface IColumnMenu {
  column_id: number;
  wip_limit_on: boolean;
  wip_limit: number;
}

export interface IColumnMove {
  column_id: number;
  column_index: number;
}

export interface IDisplayNameForm {
  display_name: string;
}

export interface IErrorMsg {
  id: string;
  msg: string;
}

export interface IErrorInfo {
  [key: string]: IErrorMsg[];
}

export interface IListBoard {
  board: IBoardThumb;
  created_at: string;
}

export interface IMembership {
  board: string;
  user: IUser;
  role: 1 | 2 | 3;
  display_name: string;
  created_at: string;
}

export interface IMessage {
  board: string;
  msg_id: number;
  sender: IUser;
  message: string;
  created_at: string;
  updated_at: string;
  hideInfo?: boolean;
  dateString?: string;
}

export interface IModal {
  page: 'account' | 'board';
  message: string;
  leftButton?: IButton;
  rightButton?: IButton;
}

export interface IRoleForm {
  user_slug: string;
  role: 1 | 2 | 3;
}

export interface IRoute {
  path: string;
  name?: string;
}

export interface ITask {
  board: string;
  column: number;
  task_id: number;
  task_index: number;
  text: string;
  updated_at: string;
}

export interface ITaskForm {
  column_id: number;
  task_id?: number;
  text: string;
}

export interface IUser {
  user_slug: string;
  name: string;
  email: string;
  email_is_verified: boolean;
}

export interface IUserForm {
  name?: string;
  email?: string;
  password?: string;
  password_2?: string;
  current_password: string;
}

export interface IWebSocketParams {
  board_title?: string;
  column_index?: number;
  column_id?: number;
  column_title?: string;
  wip_limit_on?: boolean;
  wip_limit?: number;
  invite_email?: string;
  board_msg?: string;
  display_name?: string;
  role?: 1 | 2 | 3;
  task_id?: number;
  task_index?: number;
  text?: string;
  user_slug?: string;
}

export interface IWsError {
  command?: string;
  data?: any;
  detail?: any;
  message: string;
  created_at: string;
  user?: string;
}


// Reducer states
export interface IAccountState {
  formOnDeleteUser: boolean;
  accountModal?: IModal;
}

export interface IBoardState {
  board?: IBoardDetail;
  isReadingWs: boolean;
  isReadingHttp: boolean;
  isSending: boolean;
  wsCommand: string;
  wsParams: IWebSocketParams;
  boardForm?: IBoardForm;
  boardOptionsOn: boolean;
  columnForm?: IColumnForm;
  columnMenu?: IColumnMenu;
  columnMove?: IColumnMove;
  displayNameForm?: IDisplayNameForm;
  inviteFormOn: boolean;
  msgFormWillClear: boolean;
  roleForm?: IRoleForm;
  taskForm?: ITaskForm;
  boardModal?: IModal;
  userRole?: 1 | 2 | 3;
  willLoginFromDemo: boolean;
}

export interface IDashboardState {
  boards: IListBoard[];
  errorRetrieve?: Error;
  isRetrieving: boolean;
  isCreating: boolean;
  formOnCreateBoard: boolean;
  menuOn: boolean;
  searchBarOn: boolean;
}

export interface IUserState {
  clientIp?: string;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  isRegistering: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  user?: IUser;
}