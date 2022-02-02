import React, { Component, MouseEvent } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import isEmpty from 'lodash/isEmpty';

import Head from 'next/head';
import { withRouter, NextRouter } from 'next/router';
import { mutate } from 'swr';

import {
  AccountFormDeleteUser,
  AccountFormUpdateUser,
  LeftArrowIcon,
  LoadingView,
  Modal,
} from '@/components';
import { AppDispatch, AppState, IModal } from '@/types';
import { request } from '@/utils';


class Account extends Component<Props> {
  private authTimeout?: ReturnType<typeof setTimeout>;

  constructor(props: Props) {
    super(props);
    this.authTimeout = undefined;
    this.handleBack = this.handleBack.bind(this);
    this.authTimeout = undefined;
    this.handleBack = this.handleBack.bind(this);
    this.handleEsc = this.handleEsc.bind(this);
    this.handleFormDeleteShow = this.handleFormDeleteShow.bind(this);
    this.handleEmailVerification = this.handleEmailVerification.bind(this);
  }

  handleBack(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    this.props.router.push('/dashboard');
  };

  handleEsc(e: KeyboardEvent) {
    if (e.code === 'Escape') {
      if (this.props.accountModal) {
        this.props.accountModalClose();
      } else if (this.props.formOnDeleteUser) {
        this.props.accountFormDeleteClose();
      }
    }
  }

  handleFormDeleteShow(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    this.props.accountFormDeleteShow();
  }

  async handleEmailVerification(email_token: string) {
    try {
      const auth_token = localStorage.getItem('simplepasswords_token');
      await request
        .post('/auth/verify_email/')
        .set({ 'Authorization': `Token ${auth_token}` })
        .send({ token: email_token })
        .then((res) => {
          if (res.noContent) {
            const accountModal: IModal = {
              message: 'Email verified successfully!',
              page: 'account',
            };
            this.props.accountModalShow(accountModal);
          }
        });
    } catch (err: any) {
      // Possibly report to api in the future, for now just console.error
      // reportErrorToAPI(err);
      console.error(err);

      if (err?.response?.forbidden) {
        const accountModal: IModal = {
          message: err?.response?.body?.detail || 'Oops, verification failed!',
          page: 'account',
        };
        this.props.accountModalShow(accountModal);        
      }

    } finally {
      mutate('/users/');
    }
  }

  componentDidMount() {
    const { router, user } = this.props;

    this.authTimeout = setTimeout(() => {
      if (!user) router.replace('/login');
    }, 4000);

    window.addEventListener('keydown', this.handleEsc, false);

    if (!isEmpty(router.query)) {
      const { email_token } = router.query;
      if (typeof email_token === 'string') {
        this.handleEmailVerification(email_token);
      }
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { router, user } = this.props;

    // Once logged in, clear timeout
    if (user && !prevProps.user) {
      if (this.authTimeout) clearTimeout(this.authTimeout);
    }

    // If not logged in, redirect to login page
    if (!user && prevProps.user) {
      return router.replace('/login');
    }

    // If email verification query params are available, handle them
    if (isEmpty(prevProps.router.query) && !isEmpty(router.query)) {
      const { email_token } = router.query;
      if (typeof email_token === 'string') {
        this.handleEmailVerification(email_token);
      }
    }
  }

  componentWillUnmount() {
    if (this.authTimeout) clearTimeout(this.authTimeout);
    this.props.accountReset();
    window.removeEventListener('keydown', this.handleEsc, false);
  }

  render() {
    const {
      accountModal,
      formOnDeleteUser,
      isDeleting,
      isUpdating,
      user,
    } = this.props;

    return !user ? <LoadingView /> : (
      <>
        <Head>
          <title>Account - SimpleKanban</title>
          <meta name='robots' content='noindex, nofollow' />
        </Head>
        <main className='Page Page--account'>
          {!!accountModal && <Modal modal={accountModal} />}
          {formOnDeleteUser && <AccountFormDeleteUser />}
          <div className='LeftArrowIcon-container'>
            <LeftArrowIcon
              color='wh'
              onClick={this.handleBack}
              type='button'
            />
          </div>
          <h3>Update my account</h3>
          <AccountFormUpdateUser user={user} />
          <br/>
          <div className='AccountButtonDeleteUser'>
            <button
              className='AccountButtonDeleteUser-button'
              type='button'
              disabled={formOnDeleteUser || isDeleting || isUpdating}
              onClick={this.handleFormDeleteShow}
            >
              Deactivate my account
            </button>
          </div>
          <div className='Footer Footer--account' />
        </main>
      </>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  accountModal: state.account.accountModal,
  formOnDeleteUser: state.account.formOnDeleteUser,
  isDeleting: state.user.isDeleting,
  isUpdating: state.user.isUpdating,
  user: state.user.user,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  accountModalShow: (accountModal: IModal) => {
    dispatch({ type: 'ACCOUNT_MODAL_SHOW', accountModal });
  },
  accountModalClose: () => {
    dispatch({ type: 'ACCOUNT_MODAL_CLOSE' });
  },
  accountFormDeleteClose: () => {
    dispatch({ type: 'ACCOUNT_FORM_DELETE_CLOSE' });
  },
  accountFormDeleteShow: () => {
    dispatch({ type: 'ACCOUNT_FORM_DELETE_SHOW' });
  },
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