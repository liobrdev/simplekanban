import React, { Component } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import isEmpty from 'lodash/isEmpty';

import Head from 'next/head';
import { withRouter, NextRouter } from 'next/router';

import { LoadingView } from '@/components';
import { AppState } from '@/types';


class Invitation extends Component<Props, State> {
  private invitationTimeout?: ReturnType<typeof setTimeout>;

  constructor(props: Props) {
    super(props);
    this.invitationTimeout = undefined;
    this.state = { board: '', token: '', email: '' };
  }

  componentDidMount() {
    const { router } = this.props;

    if (!isEmpty(router.query)) {
      const { board, token, email } = router.query;

      if (
        typeof board === 'string' &&
        typeof token === 'string' &&
        typeof email === 'string'
      ) {
        this.setState({ board, token, email });
      }
    }

    this.invitationTimeout = setTimeout(() => {
      router.replace('/login');
    }, 4000);
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { router, user } = this.props;

    // If invitation query params are available, handle them
    if (isEmpty(prevProps.router.query) && !isEmpty(router.query)) {
      const { board, token, email } = router.query;

      if (
        typeof board === 'string' &&
        typeof token === 'string' &&
        typeof email === 'string'
      ) {
        this.setState({ board, token, email });
      }
    }

    const { board, token, email } = this.state;

    // If there are valid invitation url params
    if (
      board !== prevState.board &&
      token !== prevState.token &&
      email !== prevState.email
    ) {
      // If logged in go to board with invite_token param
      if (user) {
        router.replace(`/board/${board}?invite_token=${token}`);
      } else {
        // If not logged in, go to login page with invite params
        router.replace(`/login?board=${board}&token=${token}&email=${email}`);
      }
    }
  }

  componentWillUnmount() {
    if (this.invitationTimeout) clearTimeout(this.invitationTimeout);
  }

  render() {
    return (
      <>
        <Head>
          <title>Invitation - SimpleKanban</title>
          <meta name='robots' content='noindex, nofollow' />
        </Head>
        <LoadingView />
      </>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  user: state.user.user,
});

const connector = connect(mapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface Props extends PropsFromRedux {
  router: NextRouter;
}

interface State {
  board: string;
  token: string;
  email: string;
}

export default withRouter(connector(Invitation));