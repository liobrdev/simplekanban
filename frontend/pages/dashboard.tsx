import React, { Component } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import Head from 'next/head';
import { withRouter, NextRouter } from 'next/router';

import {
  DashboardFormCreateBoard,
  DashboardListBoards,
  DashboardNavigation,
  LoadingView,
} from '@/components';
import { AppDispatch, AppState } from '@/types';


class Dashboard extends Component<Props> {
  private authTimeout?: ReturnType<typeof setTimeout>;

  constructor(props: Props) {
    super(props);
    this.authTimeout = undefined;
  }

  componentDidMount() {
    this.props.boardReset();
    this.authTimeout = setTimeout(() => {
      if (!this.props.user) this.props.router.replace('/login');
    }, 4000);
  }

  componentDidUpdate(prevProps: Props) {
    // If not logged in, redirect to login page
    if (!this.props.user && prevProps.user) {
      this.props.router.replace('/login');
    }
  }

  componentWillUnmount() {
    if (this.authTimeout) clearTimeout(this.authTimeout);
    this.props.dashboardReset();
  }

  render() {
    const { error, formOn, menuOn, user } = this.props;

    return !user ? <LoadingView /> : (
      <>
        <Head>
          <title>Dashboard - SimpleKanban</title>
          <meta name='robots' content='noindex, nofollow' />
        </Head>
        <main
          className={`Page Page--dashboard${
            menuOn ? ' is-menuOn' : ''
          }${
            formOn ? ' is-formOn' : ''
          }`}
        >
          {!error && formOn && <DashboardFormCreateBoard />}
          <DashboardNavigation />
          <h3 className='DashboardHeading'>Projects</h3>
          <DashboardListBoards />
          {!error && !formOn && <DashboardFormCreateBoard />}
          <div className='Footer Footer--dashboard' />
        </main>
      </>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  user: state.user.user,
  formOn: state.dashboard.formOnCreateBoard,
  menuOn: state.dashboard.menuOn,
  error: state.dashboard.errorRetrieve,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  dashboardReset: () => {
    dispatch({ type: 'DASHBOARD_RESET' });
  },
  boardReset: () => {
    dispatch({ type: 'BOARD_RESET' });
  },
});

const connector = connect(mapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface Props extends PropsFromRedux {
  router: NextRouter;
}

export default withRouter(connector(Dashboard));