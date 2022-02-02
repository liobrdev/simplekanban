import React, { Component, MouseEvent } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import Head from 'next/head';
import { withRouter, NextRouter } from 'next/router';

import {
  AccountFormDeleteUser,
  AccountFormUpdateUser,
  AccountModal,
  LeftArrowIcon,
  LoadingView,
} from '@/components';
import { AppDispatch, AppState } from '@/types';


class Account extends Component<Props> {
  private authTimeout?: ReturnType<typeof setTimeout>;

  constructor(props: Props) {
    super(props);
    this.authTimeout = undefined;
    this.handleBack = this.handleBack.bind(this);
  }

  handleBack(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    this.props.router.push('/dashboard');
  };

  componentDidMount() {
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
    this.props.accountReset();
  }

  render() {
    return !this.props.user ? <LoadingView /> : (
      <>
        <Head>
          <title>Account - SimpleKanban</title>
          <meta name='robots' content='noindex, nofollow' />
        </Head>
        <main className='Page Page--account'>
          <AccountModal />
          <div className='LeftArrowIcon-container'>
            <LeftArrowIcon
              color='wh'
              onClick={this.handleBack}
              type='button'
            />
          </div>
          <h3>Update my account</h3>
          <AccountFormUpdateUser />
          <br/>
          <AccountFormDeleteUser />
          <div className='Footer Footer--account' />
        </main>
      </>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  user: state.user.user,
  accountModal: state.account.accountModal,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  accountReset: () => {
    dispatch({ type: 'ACCOUNT_RESET' });
  },
});

const connector = connect(mapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface Props extends PropsFromRedux {
  router: NextRouter;
}

export default withRouter(connector(Account));