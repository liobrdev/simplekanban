import {
  IActivityLog,
  IBoardDetail,
  IColumn,
  IListBoard,
  IMembership,
  IMessage,
  ITask,
  IUser,
} from '@/types';


export const checkActivityLog = (activityLog: any): IActivityLog => {
  if (
    !!activityLog &&
    !!activityLog.board && typeof activityLog.board === 'string' &&
    !!activityLog.created_at && typeof activityLog.created_at === 'string' &&
    !!activityLog.msg && typeof activityLog.msg === 'string'
  ) {
    const { board, command, task, msg, created_at } = activityLog;
    const obj: IActivityLog = {
      board,
      msg,
      created_at,
      task: null,
      command: null,
    };

    if (!!command && typeof command === 'string') {
      obj.command = command;
    }

    if (!!task && typeof task === 'number') {
      obj.task = task;
    }

    return obj;
  }

  const error = new Error("Failed 'checkActivityLog'");
  // error.response = res;
  throw error;
};


export const checkListBoard = (listBoard: any, res?: any): IListBoard => {
  if (
    !!listBoard && !!listBoard.board && !!listBoard.created_at &&
    !!listBoard.board.board_slug &&
    typeof listBoard.board.board_slug === 'string' &&
    !!listBoard.board.board_title &&
    typeof listBoard.board.board_title === 'string' &&
    typeof listBoard.created_at === 'string'
  ) {
    const obj: IListBoard = {
      board: {
        board_slug: listBoard.board.board_slug,
        board_title: listBoard.board.board_title,
      },
      created_at: listBoard.created_at,
    };

    return obj;
  }

  const error = new Error("Failed 'checkListBoard'");
  // error.response = res;
  throw error;
};


export const checkBoardDetail = (board: any, res?: any): IBoardDetail => {
  if (
    !!board &&
    !!board.board_slug && typeof board.board_slug === 'string' &&
    !!board.board_title && typeof board.board_title === 'string' &&
    !!board.columns && Array.isArray(board.columns) &&
    !!board.tasks && Array.isArray(board.tasks) &&
    !!board.activity_logs && Array.isArray(board.activity_logs) &&
    !!board.memberships && Array.isArray(board.memberships) &&
    !!board.messages && Array.isArray(board.messages) &&
    !!board.created_at && typeof board.created_at === 'string' &&
    !!board.updated_at && typeof board.updated_at === 'string' &&
    typeof board.messages_allowed === 'boolean' &&
    typeof board.new_members_allowed === 'boolean'
  ) {
    const obj: IBoardDetail = {
      board_slug: board.board_slug,
      board_title: board.board_title,
      created_at: board.created_at,
      updated_at: board.updated_at,
      messages_allowed: board.messages_allowed,
      new_members_allowed: board.new_members_allowed,
      columns: [],
      tasks: [],
      activity_logs: [],
      memberships: [],
      messages: [],
    };

    board.columns.forEach((entry: any) => {
      obj.columns.push(checkColumn(entry));
    });

    board.tasks.forEach((entry: any) => {
      obj.tasks.push(checkTask(entry));
    });

    board.activity_logs.forEach((entry: any) => {
      obj.activity_logs.push(checkActivityLog(entry));
    });

    board.memberships.forEach((entry: any) => {
      obj.memberships.push(checkMembership(entry));
    });

    board.messages.forEach((entry: any) => {
      obj.messages.push(checkMessage(entry));
    });

    return obj;
  }

  const error = new Error("Failed 'checkBoardDetail'");
  // error.response = res;
  throw error;
};


export const checkColumn = (column: any, res?: any): IColumn => {
  if (
    !!column &&
    !!column.board && typeof column.board === 'string' &&
    !!column.column_id && typeof column.column_id === 'number' &&
    typeof column.column_index === 'number' &&
    !!column.column_title && typeof column.column_title === 'string' &&
    !!column.updated_at && typeof column.updated_at === 'string' &&
    !!column.wip_limit && typeof column.wip_limit === 'number' &&
    typeof column.wip_limit_on === 'boolean'
  ) {
    const obj: IColumn = {
      board: column.board,
      column_id: column.column_id,
      column_index: column.column_index,
      column_title: column.column_title,
      updated_at: column.updated_at,
      wip_limit: column.wip_limit,
      wip_limit_on: column.wip_limit_on,
    };

    return obj;
  }

  const error = new Error("Failed 'checkColumn'");
  // error.response = res;
  throw error;
};


export const checkMessage = (msg: any, res?: any): IMessage => {
  if (
    !!msg &&
    !!msg.board && typeof msg.board === 'string' &&
    !!msg.msg_id && typeof msg.msg_id === 'number' &&
    !!msg.message && typeof msg.message === 'string' &&
    !!msg.created_at && typeof msg.created_at === 'string' &&
    !!msg.updated_at && typeof msg.updated_at === 'string'
  ) {
    const obj: IMessage = {
      sender: checkUser(msg.sender),
      board: msg.board,
      msg_id: msg.msg_id,
      message: msg.message,
      created_at: msg.created_at,
      updated_at: msg.updated_at,
    };

    return obj;
  }

  const error = new Error("Failed 'checkMessage'");
  // error.response = res;
  throw error;
};


export const checkMembership = (membership: any, res?: any): IMembership => {
  if (
    !!membership &&
    !!membership.board && typeof membership.board === 'string' &&
    !!membership.role && [1, 2, 3].includes(membership.role) &&
    !!membership.created_at && typeof membership.created_at === 'string' &&
    typeof membership.display_name === 'string'
  ) {
    const obj: IMembership = {
      board: membership.board,
      role: membership.role,
      display_name: membership.display_name,
      created_at: membership.created_at,
      user: checkUser(membership.user),
    };

    return obj;
  }

  const error = new Error("Failed 'checkMembership'");
  // error.response = res;
  throw error;
};


export const checkTask = (task: any, res?: any): ITask => {
  if (
    !!task &&
    !!task.board && typeof task.board === 'string' &&
    !!task.column && typeof task.column === 'number' &&
    !!task.task_id && typeof task.task_id === 'number' &&
    typeof task.task_index === 'number' &&
    !!task.text && typeof task.text === 'string' &&
    !!task.updated_at && typeof task.updated_at === 'string'
  ) {
    const obj: ITask = {
      board: task.board,
      column: task.column,
      task_id: task.task_id,
      task_index: task.task_index,
      text: task.text,
      updated_at: task.updated_at,
    };
    
    return obj
  }

  const error = new Error("Failed 'checkTask'");
  // error.response = res;
  throw error;
};


export const checkToken = (token: any, res?: any): string => {
  if (!!token && typeof token === 'string' && /^[\w-]{64}$/.test(token)) {
    return token;
  }

  const error = new Error("Failed 'checkToken'");
  // error.response = res;
  throw error;
};


export const checkUser = (user: any, res?: any): IUser => {
  if (
    !!user &&
    !!user.user_slug && typeof user.user_slug === 'string' &&
    !!user.name && typeof user.name === 'string' &&
    !!user.email && typeof user.email === 'string'
  ) {
    const obj: IUser = {
      user_slug: user.user_slug,
      name: user.name,
      email: user.email,
    };

    return obj;
  }

  const error = new Error("Failed 'checkUser'");
  // error.response = res;
  throw error;
};