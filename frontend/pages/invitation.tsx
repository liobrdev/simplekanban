import React, { Component } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import Head from 'next/head';
import { withRouter, NextRouter } from 'next/router';

import { LoadingView } from '@/components';
import { AppState } from '@/types';
import { getInviteQueryString } from '@/utils';


class Invitation extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { retryCount: 0 };
  }

  componentDidUpdate(prevProps: Props) {
    const { router, user } = this.props;
    let { retryCount } = this.state;

    const queryString = getInviteQueryString(router.query);
    // If there are valid invitation url params
    if (queryString) {
      // If logged in go to board with invite_token param
      if (user) {
        const { board, token } = router.query;
        router.replace(`/board/${board}?invite_token=${token}`);
      } else {
        // If not logged in, go to login page with invite params
        router.replace(`/login${queryString}`);
      }
    } else {
      // Otherwise just go to home page after 3 unsuccesful attempts
      // to find valid query string parameters
      if (retryCount >= 3) {
        router.replace('/');
      } else {
        retryCount += 1;
        this.setState({ retryCount });
      }
    }
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
  retryCount: number;
}

export default withRouter(connector(Invitation));