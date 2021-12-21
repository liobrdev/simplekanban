import { Component, FormEvent, MouseEvent } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { debounce } from 'lodash';

import {
  AppDispatch,
  AppState,
  BoardCommands,
  IColumn,
  IColumnForm,
  IWebSocketParams,
} from '@/types';

import { CloseIcon, Input } from './';


class BoardColumnTitle extends Component<Props, State> {
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
    if (this.props.userRole === 1 || this.props.userRole === 2) {
      const form: IColumnForm = {
        column_id: this.props.column.column_id,
        column_title: this.props.column.column_title,
      };
      this.props.columnFormShow(form);
    }
  }

  handleClose(e: MouseEvent<HTMLButtonElement | HTMLDivElement>) {
    e.preventDefault();
    this.props.columnFormClose();
  }

  handleInput(e: FormEvent<HTMLInputElement>) {
    e.preventDefault();
    const name = (e.target as HTMLInputElement).name;
    const value = (e.target as HTMLInputElement).value;
    this.props.columnFormInput(name, value);
  }

  handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { columnForm, column, formOn } = this.props;
    if (
      formOn &&
      columnForm?.column_title !== column?.column_title &&
      columnForm?.column_title !== ''
    ) {
      const wsCommand = BoardCommands.UPDATE_COLUMN;
      const wsParams = { ...columnForm };
      this.props.startWsCommand(wsCommand, wsParams);
    }  else this.props.columnFormClose();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.state.didFocus && !prevState.didFocus) {
      const parent = document.getElementById(
        `boardColumnTitleButtonText_${this.props.column.column_id}`
      );
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
    const {
      column,
      columnForm,
      boardModal,
      formOn,
      isSending,
      userRole,
    } = this.props;

    const { isOverflowing, animationDuration } = this.state;

    const buttonsDisabled = !!boardModal;

    const hasPermission = userRole === 1 || userRole === 2;

    const form = (
      <form
        className='BoardColumnTitle-form'
        id={`boardColumnTitleForm_${column.column_id}`}
        onSubmit={!isSending ? this.handleSubmit : undefined}
      >
        <div className='CloseIcon-container'>
          <CloseIcon
            type='button'
            title='Close'
            onClick={this.handleClose}
            disabled={buttonsDisabled}
          />
        </div>
        <Input
          className='BoardColumnTitle-form-input'
          type='text'
          name='column_title'
          value={columnForm?.column_title}
          disabled={buttonsDisabled}
          maxLength={80}
          onChange={this.handleInput}
          autoFocus
          required
        />
      </form>
    );

    const button = (
      <button
        className={`BoardColumnTitle-button${isOverflowing ? ' is-overflowing' : ''}`}
        type='button'
        title={hasPermission ? 'Edit column title' : column.column_title}
        disabled={buttonsDisabled}
        onClick={this.handleShow}
        onFocus={this.handleFocus}
        onMouseEnter={this.handleFocus}
      >
        <div
          className='BoardColumnTitle-button-text'
          id={`boardColumnTitleButtonText_${column.column_id}`}
        >
          <span
            className='BoardColumnTitle-button-text-outer'
            style={isOverflowing ? { animationDuration } : undefined}
          >
            <span
              className='BoardColumnTitle-button-text-outer-inner'
              style={isOverflowing ? { animationDuration } : undefined}
            >
              {column?.column_title}&nbsp;&nbsp;&nbsp;&nbsp;
            </span>
          </span>
        </div>
      </button>
    );

    return (
      <div className={`BoardColumnTitle${
        hasPermission ? ' is-authenticated' : ''
      }`}>
        {!!formOn ? form : button}
      </div>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  columnForm: state.board.columnForm,
  boardModal: state.board.boardModal,
  isSending: state.board.isSending,
  userRole: state.board.userRole,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  columnFormShow: (columnForm?: IColumnForm) => {
    dispatch({ type: 'COLUMN_FORM_SHOW', columnForm });
  },
  columnFormClose: () => {
    dispatch({ type: 'COLUMN_FORM_CLOSE' });
  },
  columnFormInput: (name: string, value: boolean | number | string) => {
    dispatch({ type: 'COLUMN_FORM_INPUT', name, value });
  },
  startWsCommand: (wsCommand: BoardCommands, wsParams: IWebSocketParams) => {
    dispatch({ type: 'START_WS_COMMAND', wsCommand, wsParams });
  }
});

const connector = connect(mapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface Props extends PropsFromRedux {
  column: IColumn;
  formOn?: boolean;
}

interface State {
  didFocus: boolean;
  isOverflowing: boolean;
  animationDuration: '0s' | '10s' | '15s' | '20s';
}

export default connector(BoardColumnTitle);