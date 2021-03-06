export enum AuthCommands {
  LOGIN = 'login',
  LOGOUT = 'logout',
  REGISTER = 'register',
  FORGOT_PW = 'forgot_password',
  RESET_PW = 'reset_password',
  VERIFY_EMAIL = 'verify_email',
}

export enum BoardCommands {
  READ_BOARD = 'read_board',
  CREATE_BOARD = 'create_board',
  DELETE_BOARD = 'delete_board',
  UPDATE_BOARD =  'update_board',
  LIST_BOARDS = 'list_boards',
  TITLE = 'update_board_title',
  CREATE_MSG = 'create_msg',
  UPDATE_MSG = 'update_msg',
  CREATE_TASK = 'create_task',
  UPDATE_TASK = 'update_task',
  MOVE_TASK = 'move_task',
  DELETE_TASK = 'delete_task',
  CREATE_COLUMN = 'create_column',
  UPDATE_COLUMN = 'update_column',
  MOVE_COLUMN = 'move_column',
  DELETE_COLUMN = 'delete_column',
  DISPLAY_NAME = 'update_member_display_name',
  ROLE = 'update_member_role',
  JOIN = 'join_board',
  REMOVE = 'remove_member',
  LEAVE = 'leave_board',
  INVITE = 'invite_member',
  NO_COMMAND = 'no_command',
  SUBMIT_DEMO = 'submit_demo',
}

export enum UserCommands {
  DEACTIVATE = 'deactivate_account',
  UPDATE = 'update_user',
  UPGRADE = 'upgrade_account',
  DOWNGRADE = 'downgrade_account',
}

export enum ChannelCodes {
  ERROR = 'WEBSOCKET_ERROR',
  INVALID_CONTENT = 'INVALID_CONTENT',
  BOARD_FAILED = 'BOARD_FAILED',
  JOIN_FAILED = 'JOIN_FAILED',
  USER_FAILED = 'USER_FAILED',
  MISSING = 'MISSING_COMMAND',
  NOT_ALLOWED = 'NOT_ALLOWED',
  SERVER = 'SERVER_FAIL',
  THROTTLED = 'THROTTLED',
  BOARD_LOADED = 'BOARD_LOADED',
  USER_UPDATED = 'USER_UPDATED',
  ROLE_UPDATED = 'ROLE_UPDATED',
  BOARD_UPDATED = 'BOARD_UPDATED',
  COLUMNS_SAVED = 'COLUMNS_SAVED',
  MEMBERS_SAVED = 'MEMBERS_SAVED',
  MSG_CREATED = 'MSG_CREATED',
  TASKS_SAVED = 'TASKS_SAVED',
  BOARD_DELETED = 'BOARD_DELETED',
  INVITE_SENT = 'INVITE_SENT',
  INVITE_NOT_SENT = 'INVITE_NOT_SENT',
  ALREADY_INVITED = 'ALREADY_INVITED',
  ALREADY_MEMBER = 'ALREADY_MEMBER',
  BOARD_FULL = 'BOARD_FULL',
}