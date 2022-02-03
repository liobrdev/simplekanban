import React, { Component, MouseEvent } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';

import ReconnectingWebSocket, { ErrorEvent } from 'reconnecting-websocket';

import Head from 'next/head';
import { withRouter, NextRouter } from 'next/router';
import { mutate } from 'swr';

import {
  BoardListColumns,
  BoardOptions,
  BoardRetrieveBoard,
  BoardTitle,
  LeftArrowIcon,
  LoadingView,
  Modal,
} from '@/components';

import {
  AppDispatch,
  AppState,
  ChannelCodes,
  checkBoardDetail,
  checkColumn,
  checkMessage,
  checkMembership,
  checkTask,
  IBoardDetail,
  IColumn,
  IMembership,
  IMessage,
  IModal,
  ITask,
} from '@/types';


class Board extends Component<Props> {
  private rws?: ReconnectingWebSocket;
  private timeoutCheckUser?: ReturnType<typeof setTimeout>;
  private timeoutRedirect?: ReturnType<typeof setTimeout>;

  constructor(props: Props) {
    super(props);
    this.rws = undefined;
    this.timeoutCheckUser = undefined;
    this.timeoutRedirect = undefined;
    this.handleClick = this.handleClick.bind(this);
    this.handleEsc = this.handleEsc.bind(this);
    this.handleRwsError = this.handleRwsError.bind(this);
    this.handleRwsMessage = this.handleRwsMessage.bind(this);
  }

  setUpRws() {
    // Configure WebSocket
    const token = localStorage.getItem('simplekanban_token');
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsHost =
      process.env.NEXT_PUBLIC_SIMPLEKANBAN_API_HOST || window.location.host;
    const { board_slug, invite_token } = this.props.router.query;
    const auth = `auth_token=${token ? token : ''}`;
    const ip = `client_ip=${this.props.ip ? this.props.ip : ''}`;
    const invite = `invite_token=${invite_token ? invite_token : ''}`;
    const pathname =
      `${wsScheme}://${wsHost}/ws/board/${board_slug}/?${auth}&${ip}&${invite}`;
    this.rws = new ReconnectingWebSocket(pathname, [], { maxRetries: 2 });
    this.rws.addEventListener('open', this.props.startReadBoard);
    this.rws.addEventListener('message', this.handleRwsMessage);
    this.rws.addEventListener('error', this.handleRwsError);
  }

  tearDownRws() {
    if (this.rws) {
      this.rws.removeEventListener('open', this.props.startReadBoard);
      this.rws.removeEventListener('message', this.handleRwsMessage);
      this.rws.removeEventListener('error', this.handleRwsError);
      this.rws.close();
      this.rws = undefined;
    }
  }

  setTimeoutCheckUser() {
    if (this.timeoutCheckUser) clearTimeout(this.timeoutCheckUser);
    this.timeoutCheckUser = setTimeout(() => {
      if (!this.props.user) this.props.router.replace('/login');
    }, 4000);    
  }

  setTimeoutRedirect() {
    if (this.timeoutRedirect) clearTimeout(this.timeoutRedirect);
    this.timeoutRedirect = setTimeout(() => {
      this.props.router.push('/dashboard');
    }, 4000);    
  }

  boardLoaded(data: any, closeForm: boolean = false) {
    this.props.successReadBoard(checkBoardDetail(data));
    if (closeForm) this.props.boardFormClose();
  }

  msgCreated(data: any, clearForm: boolean = false) {
    this.props.successCreateMsg(checkMessage(data));
    if (clearForm) this.props.msgFormClear();
  }

  columnsSaved(data: any, closeForm: boolean = false) {
    if (Array.isArray(data)) {
      this.props.successSaveColumns(data.map(checkColumn));
    }

    if (closeForm) {
      this.props.boardModalClose();
      this.props.columnFormClose();
      this.props.columnMenuClose();
    }
  }

  membersSaved(data: any, closeForm: boolean = false) {
    if (Array.isArray(data)) {
      const members = data.map(checkMembership);
      this.props.successSaveMembers(members);

      // Don't close modal or form if this client has
      // just left or been removed from the board
      if (
        !members.find(m => m.user.user_slug === this.props.user?.user_slug)
      ) closeForm = false;
    } else if (
      !!data &&
      Array.isArray(data['updated_slugs']) &&
      Array.isArray(data['members'])
    ) {
      this.props.successSaveMembers(data['members'].map(checkMembership));

      if (data['updated_slugs'].includes(this.props.user?.user_slug)) {
        this.props.memberFormClose();
        this.props.columnFormClose();
        this.props.columnMenuClose();
      }
    }

    if (closeForm) {
      this.props.boardModalClose();
      this.props.memberFormClose();
      mutate(`/boards/${this.props.router.query.board_slug}/`);
    }
  }

  tasksSaved(data: any, closeForm: boolean = false) {
    if (Array.isArray(data)) {
      this.props.successSaveTasks(data.map(checkTask));
    }

    if (closeForm) {
      this.props.boardModalClose();
      this.props.taskFormClose();
      this.props.columnFormClose();
      this.props.columnMenuClose();
    }
  }

  inviteSent(message: any) {
    if (message && typeof message === 'string') {
      this.props.inviteFormClose();
      this.props.boardModalShow(message);
    } else throw new Error("Failed 'inviteSent'");
  }

  inviteNotSent(message: any) {
    if (message && typeof message === 'string') {
      this.props.boardModalShow(message);
    } else throw new Error("Failed 'inviteNotSent'");
  }

  boardDeleted(data: any) {
    if (data && typeof data === 'string') {
      this.props.boardModalShow(data);
      this.setTimeoutRedirect();
    } else throw new Error("Failed 'boardDeleted'");
  }

  authFailed(error: any) {
    if (typeof error?.message === 'string') {
      this.props.setUserRole();
      this.props.successReadBoard();
      this.props.boardModalShow(error.message);
      this.setTimeoutRedirect();
    } else throw new Error("Failed 'authFailed'");
  }

  boardError(error: any) {
    if (typeof error?.message === 'string') {
      this.props.boardModalShow(error.message);
    } else throw new Error("Failed 'boardError'");
  }

  handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    this.props.router.push('/dashboard');
  };

  handleEsc(e: KeyboardEvent) {
    if (e.code === 'Escape') {
      if (this.props.boardModal) {
        this.props.boardModalClose();
      } else if (this.props.inviteFormOn) {
        this.props.inviteFormClose();
      } else if (this.props.displayNameForm || this.props.roleForm) {
        this.props.memberFormClose();
      } else {
        this.props.boardFormClose();
        this.props.boardOptionsClose();
        this.props.columnFormClose();
        this.props.columnMenuClose();
        this.props.taskFormClose();
      }
    }
  }

  handleRwsMessage(rwsResponse: any) {
    try {
      const res = JSON.parse(rwsResponse.data);
      let { code, data, error, message, user } = res;

      const thisClientSentMessage =
        typeof user === 'string' && this.props.user?.user_slug === user;

      if (thisClientSentMessage) this.props.stopWsCommand();

      if (
        code === ChannelCodes.BOARD_LOADED ||
        code === ChannelCodes.BOARD_UPDATED
      ) {
        this.boardLoaded(data, thisClientSentMessage);
      } else if (code === ChannelCodes.MSG_CREATED) {
        this.msgCreated(data, thisClientSentMessage);
      } else if (code === ChannelCodes.COLUMNS_SAVED) {
        this.columnsSaved(data, thisClientSentMessage);
      } else if (code === ChannelCodes.TASKS_SAVED) {
        this.tasksSaved(data, thisClientSentMessage);
      } else if (code === ChannelCodes.MEMBERS_SAVED) {
        this.membersSaved(data, thisClientSentMessage);
      } else if (code === ChannelCodes.INVITE_SENT) {
        this.inviteSent(message);
      } else if (code === ChannelCodes.INVITE_NOT_SENT) {
        this.inviteNotSent(message);
      } else if (code === ChannelCodes.BOARD_DELETED) {
        this.boardDeleted(data);
      } else if (
        code === ChannelCodes.BOARD_FAILED ||
        code === ChannelCodes.JOIN_FAILED ||
        code === ChannelCodes.USER_FAILED
      ) {
        this.props.stopWsCommand();
        this.authFailed(error);
      } else if (code === ChannelCodes.ERROR) {
        this.boardError(error);
      } else {
        const rwsError = new Error('Received invalid WebSocket message');
        // rwsError.response = res;
        throw rwsError;
      }
    } catch (err) {
      // Possibly report to api in the future, for now just console.error
      // reportErrorToAPI(err);
      console.error(err);
    }
  }

  handleRwsError(e: ErrorEvent) {
    // Possibly report to api in the future, for now just console.error
    // reportErrorToAPI(e.error);
    console.error(e.error);
    this.props.setUserRole();
    this.props.successReadBoard();
    const message = e.error?.message || e.message || 'Oops! Something went wrong.';
    this.props.boardModalShow(message);
  }

  componentDidMount() {
    this.setTimeoutCheckUser();
    if (!isEmpty(this.props.router.query) && this.props.ip) this.setUpRws();
    window.addEventListener('keydown', this.handleEsc, false);
  }

  componentDidUpdate(prevProps: Props) {
    // If not logged in, redirect to login page
    if (!this.props.user && prevProps.user) {
      this.props.router.replace('/login');
    }

    // Once query params are available, set up the WebSocket
    if (
      (isEmpty(prevProps.router.query) || !prevProps.ip) &&
      !isEmpty(this.props.router.query) && this.props.ip
    ) this.setUpRws();

    // Listen for redux state change from 'START_WS_COMMAND',
    // then send the command along with its params
    if (
      this.props.isSending && !prevProps.isSending &&
      this.props.wsCommand && !prevProps.wsCommand &&
      this.rws
    ) {
      this.rws.send(JSON.stringify({
        ...this.props.wsParams,
        command: this.props.wsCommand,
      }));
    }

    // Get user's role upon board load or member update
    if (
      this.props.board && (
        !prevProps.board || (
          !isEqual(this.props.board.memberships, prevProps.board.memberships)
        )
      )
    ) {
      const { board: { memberships }, user } = this.props;
      const member =
        memberships.find(m => m.user.user_slug === user?.user_slug);

      if (member) {
        this.props.setUserRole(member.role);
      } else {
        this.props.memberFormClose();
        this.props.setUserRole();
        this.props.successReadBoard();
        this.props.boardModalShow('You may not view this project.');
        this.setTimeoutRedirect();
      }
    }
  }

  componentWillUnmount() {
    if (this.timeoutCheckUser) clearTimeout(this.timeoutCheckUser);
    if (this.timeoutRedirect) clearTimeout(this.timeoutRedirect);
    this.tearDownRws();
    this.props.boardReset();
    window.removeEventListener('keydown', this.handleEsc, false);
  }

  render() {
    const { boardModal } = this.props;
    const isLoading = !this.props.user || this.props.isReadingWs;
    const title = this.props.board?.board_title || 'Loading...';
    const { board_slug } = this.props.router.query;

    let slug: string | undefined;

    if (typeof board_slug === 'string') {
      slug = board_slug;
    }

    return (
      <>
        <Head>
          <title>{`${title} - SimpleKanban`}</title>
          <meta name='robots' content='noindex, nofollow' />
        </Head>
        {!!slug && <BoardRetrieveBoard slug={slug} />}
        {isLoading ? <LoadingView className='LoadingView--dashboard' /> : (
          <main className='Page Page--board'>
            {!!boardModal && <Modal modal={boardModal} />}
            <div className={`LeftArrowIcon-container${
              this.props.boardForm ? ' is-hidden' : ''
            }`}>
              <LeftArrowIcon
                onClick={this.handleClick}
                src='/left-arrow-wh.png'
                type='button'
                title='Back to dashboard'
              />
            </div>
            {(!this.props.board || !this.props.userRole) ? (
              <div className='BoardNotFound'>
                <h1>Board not found!</h1>
                <h2>
                  You might not have permission to view this project,
                  or this project does not exist.
                </h2>
              </div>
            ) : (
              <>
                <BoardTitle />
                <BoardOptions isHidden={!!this.props.boardForm} />
                <BoardListColumns />
              </>
            )}
          </main>          
        )}
      </>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  board: state.board.board,
  boardForm: state.board.boardForm,
  boardModal: state.board.boardModal,
  displayNameForm: state.board.displayNameForm,
  inviteFormOn: state.board.inviteFormOn,
  isReadingWs: state.board.isReadingWs,
  isSending: state.board.isSending,
  roleForm: state.board.roleForm,
  wsCommand: state.board.wsCommand,
  wsParams: state.board.wsParams,
  userRole: state.board.userRole,
  user: state.user.user,
  ip: state.user.clientIp,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  // Board actions
  startReadBoard: () => {
    dispatch({ type: 'START_WS_READ_BOARD' });
  }, 
  successReadBoard: (board?: IBoardDetail) => {
    dispatch({ type: 'SUCCESS_WS_READ_BOARD', board });
  }, 
  // Close forms
  boardFormClose: () => {
    dispatch({ type: 'BOARD_FORM_CLOSE' });
  },
  boardOptionsClose: () => {
    dispatch({ type: 'BOARD_OPTIONS_CLOSE' });
  },
  columnFormClose: () => {
    dispatch({ type: 'COLUMN_FORM_CLOSE' });
  },
  columnMenuClose: () => {
    dispatch({ type: 'COLUMN_MENU_CLOSE' });
  },
  taskFormClose: () => {
    dispatch({ type: 'TASK_FORM_CLOSE' });
  },
  inviteFormClose: () => {
    dispatch({ type: 'INVITE_FORM_CLOSE' });
  },
  memberFormClose: () => {
    dispatch({ type: 'MEMBER_FORM_CLOSE' });
  },
  // Input forms
  msgFormClear: () => {
    dispatch({ type: 'MSG_FORM_CLEAR' });
  },
  // Update board page
  successSaveColumns: (columns: IColumn[]) => {
    dispatch({ type: 'SUCCESS_SAVE_COLUMNS', columns });
  },
  successSaveMembers: (memberships: IMembership[]) => {
    dispatch({ type: 'SUCCESS_SAVE_MEMBERS', memberships });
  },
  successCreateMsg: (message: IMessage) => {
    dispatch({ type: 'SUCCESS_CREATE_MSG', message });
  },
  successSaveTasks: (tasks: ITask[]) => {
    dispatch({ type: 'SUCCESS_SAVE_TASKS', tasks });
  },
  // Other
  boardModalShow: (message: string) => {
    const boardModal: IModal = { page: 'board', message };
    dispatch({ type: 'BOARD_MODAL_SHOW', boardModal });
  },
  boardModalClose: () => {
    dispatch({ type: 'BOARD_MODAL_CLOSE' });
  },
  boardReset: () => {
    dispatch({ type: 'BOARD_RESET' });
  },
  setUserRole: (userRole?: 1 | 2 | 3) => {
    dispatch({ type: 'SET_USER_ROLE', userRole });
  },
  stopWsCommand: () => {
    dispatch({ type: 'STOP_WS_COMMAND' });
  },
});

const connector = connect(mapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface Props extends PropsFromRedux {
  router: NextRouter;
}

export default withRouter(connector(Board));