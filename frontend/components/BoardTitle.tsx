import { Component, FormEvent, MouseEvent } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { debounce } from 'lodash';

import {
  AppDispatch,
  AppState,
  BoardCommands,
  IWebSocketParams,
} from '@/types';

import { CheckIcon, CloseIcon, Input } from './';


class BoardTitle extends Component<Props, State> {
  private focusTimeout?: ReturnType<typeof setTimeout>;

  constructor(props: Props) {
    super(props);
    
    this.state = {
      didFocus: false,
      isOverflowing: false,
      animationDuration: '0s',
    };
    
    this.focusTimeout = undefined;
    this.handleClose = this.handleClose.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleShow = this.handleShow.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleFocus = debounce(this.handleFocus.bind(this), 1000, {
      leading: true,
      trailing: false,
    });
  };
  
  handleFocus() {
    this.focusTimeout =
      setTimeout(() => this.setState({ didFocus: true }), 250);
  };
  
  handleShow(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (this.props.userRole === 1 || this.props.isDemo) {
      this.props.boardFormShow();
    }
  }

  handleClose(e: MouseEvent<HTMLButtonElement | HTMLDivElement>) {
    e.preventDefault();
    this.props.boardFormClose();
  }

  handleInput(e: FormEvent<HTMLInputElement>) {
    e.preventDefault();
    const board_title = (e.target as HTMLInputElement).value;
    this.props.boardFormInput(board_title);
  };

  handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (this.props.board?.board_title !== this.props.boardForm?.board_title) {
      if (this.props.isDemo) {
        this.props.boardFormSubmit();
      } else {
        const wsCommand = BoardCommands.TITLE;
        const wsParams = { ...this.props.boardForm };
        this.props.startWsCommand(wsCommand, wsParams);
      }
    } else this.props.boardFormClose();
  };
  
  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.state.didFocus && !prevState.didFocus) {
      const parent = document.getElementById('boardTitleButtonText');
      const child = parent?.firstElementChild as HTMLElement;

      if (parent && child) {
        const diff = child.offsetWidth - parent.offsetWidth;

        if (diff <= 0) {
          this.setState({ isOverflowing: false });
        } else if (diff <= 200) {
          this.setState({ animationDuration: '10s', isOverflowing: true });
        } else if (diff <= 400) {
          this.setState({ animationDuration: '15s', isOverflowing: true });
        } else {
          this.setState({ animationDuration: '20s', isOverflowing: true });
        }
      }

      this.setState({ didFocus: false });
    }
  }

  componentWillUnmount() {
    if (this.focusTimeout) clearTimeout(this.focusTimeout);
    (this.handleFocus as ReturnType<typeof debounce>).cancel();
  }

  render() {
    const { board, boardForm, boardModal, isSending, userRole } = this.props;
    const { isOverflowing, animationDuration } = this.state;

    const canSubmit = !!boardForm?.board_title && !isSending;

    const buttonsDisabled = isSending || !!boardModal;

    const hasPermission = userRole === 1;

    const form = (
      <form
        className='BoardTitle-form'
        onSubmit={canSubmit ? this.handleSubmit : undefined}
      >
        <div className='CloseIcon-container'>
          <CloseIcon
            onClick={this.handleClose}
            disabled={buttonsDisabled}
            type='button'
          />
        </div>
        <Input
          className='BoardTitle-form-input'
          type='text'
          name='board_title'
          value={boardForm?.board_title}
          disabled={buttonsDisabled}
          minLength={1}
          maxLength={200}
          onChange={this.handleInput}
          autoFocus
          required
        />
        <div className='CheckIcon-container'>
          <CheckIcon
            type='submit'
            disabled={!canSubmit || !!boardModal}
          />
        </div>
      </form>
    );

    const title = (
      <button
        className={`BoardTitle-button${isOverflowing ? ' is-overflowing' : ''}`}
        type='button'
        title={hasPermission ? 'Edit board title' : board?.board_title}
        disabled={buttonsDisabled}
        onClick={this.handleShow}
        onFocus={this.handleFocus}
        onMouseEnter={this.handleFocus}
      >
        <div className='BoardTitle-button-text' id='boardTitleButtonText'>
          <span
            className='BoardTitle-button-text-outer'
            style={isOverflowing ? { animationDuration } : undefined}
          >
            <p
              className='BoardTitle-button-text-outer-inner'
              style={isOverflowing ? { animationDuration } : undefined}
            >
              {board?.board_title}&nbsp;&nbsp;&nbsp;&nbsp;
            </p>
          </span>
        </div>
      </button>
    );

    return (
      <div className={`BoardTitle${!!boardForm ? ' is-on' : ''}`}>
        {!!boardForm ? form : title}
      </div>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  board: state.board.board,
  boardForm: state.board.boardForm,
  boardModal: state.board.boardModal,
  isSending: state.board.isSending,
  userRole: state.board.userRole,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  boardFormShow: () => {
    dispatch({ type: 'BOARD_FORM_SHOW' });
  },
  boardFormClose: () => {
    dispatch({ type: 'BOARD_FORM_CLOSE' });
  },
  boardFormInput: (board_title: string) => {
    dispatch({ type: 'BOARD_FORM_INPUT', board_title });
  },
  boardFormSubmit: () => {
    dispatch({ type: 'BOARD_FORM_SUBMIT' });
  },
  startWsCommand: (wsCommand: BoardCommands, wsParams: IWebSocketParams) => {
    dispatch({ type: 'START_WS_COMMAND', wsCommand, wsParams });
  }
});

const connector = connect(mapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface Props extends PropsFromRedux {
  isDemo?: boolean;
}

interface State {
  didFocus: boolean;
  isOverflowing: boolean;
  animationDuration: '0s' | '10s' | '15s' | '20s';
}

export default connector(BoardTitle);