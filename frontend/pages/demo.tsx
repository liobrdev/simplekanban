import React, { Component, MouseEvent } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import Head from 'next/head';
import { withRouter, NextRouter } from 'next/router';

import {
  BoardListColumns,
  BoardOptions,
  BoardTitle,
  LeftArrowIcon,
  LoadingView,
  Modal,
} from '@/components';

import { AppDispatch, AppState, IBreadcrumbListItem } from '@/types';


class Board extends Component<Props> {
  constructor(props: Props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
    this.handleEsc = this.handleEsc.bind(this);
  }

  handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    this.props.router.push('/');
  };

  handleEsc(e: KeyboardEvent) {
    if (e.code === 'Escape') {
      if (this.props.boardModal) {
        this.props.boardModalClose();
      } else {
        this.props.boardFormClose();
        this.props.boardOptionsClose();
        this.props.columnFormClose();
        this.props.columnMenuClose();
        this.props.taskFormClose();
      }
    }
  }

  componentDidMount() {
    if (this.props.user) this.props.router.replace('/dashboard');
    else if (!this.props.board) this.props.setDemoBoard();
    window.addEventListener('keydown', this.handleEsc, false);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.user && !prevProps.user) {
      this.props.router.replace('/dashboard');
    }

    if (this.props.toLoginFromDemo && !prevProps.toLoginFromDemo) {
      this.props.router.push('/register?from=demo');
    }
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleEsc, false);
    this.props.boardModalClose();
    this.props.boardFormClose();
    this.props.boardOptionsClose();
    this.props.columnFormClose();
    this.props.columnMenuClose();
    this.props.taskFormClose();
    this.props.loginFromDemo(false);
  }

  render() {
    const { boardModal } = this.props;
    const isLoading = !!this.props.user || !this.props.board;

    const breadcrumbList: IBreadcrumbListItem[] = [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://simplekanban.app"
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Demo",
        item: "https://simplekanban.app/demo"
      }
    ];

    const breadcrumb = JSON.stringify({
      "@context": "https://schema.org/",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbList
    });

    return (
      <>
        <Head>
          <title>Try it out! - SimpleKanban</title>
          <meta name='robots' content='noindex, nofollow' />
          <script type="application/ld+json">{breadcrumb}</script>
        </Head>
        {isLoading ? <LoadingView className='LoadingView--demo' /> : (
          <main className='Page Page--board'>
            {!!boardModal && <Modal modal={boardModal} />}
            <div className={`LeftArrowIcon-container${
              this.props.boardForm ? ' is-hidden' : ''
            }`}>
              <LeftArrowIcon
                onClick={this.handleClick}
                src='/left-arrow-wh.png'
                type='button'
                title='Back'
              />
            </div>
            <BoardTitle isDemo />
            <BoardOptions isHidden={!!this.props.boardForm} isDemo />
            <BoardListColumns isDemo />
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
  toLoginFromDemo: state.board.toLoginFromDemo,
  user: state.user.user,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  setDemoBoard: () => {
    dispatch({ type: 'SET_DEMO_BOARD' });
  },
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
  boardModalClose: () => {
    dispatch({ type: 'BOARD_MODAL_CLOSE' });
  },
  loginFromDemo: (value: boolean) => {
    dispatch({ type: 'TO_LOGIN_FROM_DEMO', value });
  },
});

const connector = connect(mapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface Props extends PropsFromRedux {
  router: NextRouter;
}

export default withRouter(connector(Board));