import { Component } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import isEmpty from 'lodash/isEmpty';

import Head from 'next/head';
import { withRouter, NextRouter } from 'next/router';

import { LoadingView } from '@/components';
import { AppState } from '@/types';


class VerifyEmail extends Component<Props, State> {
  private verificationTimeout?: ReturnType<typeof setTimeout>;

  constructor(props: Props) {
    super(props);
    this.verificationTimeout = undefined;
    this.state = { token: '' };
  }

  componentDidMount() {
    const { router } = this.props;

    if (!isEmpty(router.query)) {
      const { token } = router.query;
      if (token && typeof token === 'string') {
        this.setState({ token });
      }
    }

    this.verificationTimeout = setTimeout(() => {
      router.replace('/login');
    }, 4000);
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { router } = this.props;
    
    if (router.query !== prevProps.router.query) {
      const { token } = router.query;
      if (token && typeof token === 'string') {
        return this.setState({ token });
      }
    }
    
    const { token } = this.state;
    // If there are valid email verification url params
    if (token && !prevState.token) {
      // If logged in go to account page with email_token param
      if (this.props.user) {
        router.replace(`/account?email_token=${token}`);
      } else {
        // If not logged in, go to login page with email_token param
        router.replace(`/login?email_token=${token}`);
      }
    }
  }

  componentWillUnmount() {
    if (this.verificationTimeout) clearTimeout(this.verificationTimeout);
  }

  render() {
    return (
      <>
        <Head>
          <title>Verify Email - SimpleKanban</title>
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
  token: string;
}

export default withRouter(connector(VerifyEmail));