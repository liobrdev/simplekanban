import React, { Component, MouseEvent } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import isEmpty from 'lodash/isEmpty';

import Head from 'next/head';
import Link from 'next/link';
import { withRouter, NextRouter } from 'next/router';

import { LeftArrowIcon, LoadingView, LoginForm } from '@/components';
import { AppState, IBreadcrumbListItem } from '@/types';


class Login extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      board: '',
      token: '',
      email: '',
      email_token: '',
      willLogIn: false,
    };
    this.handleBack = this.handleBack.bind(this);
  }

  handleBack(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    this.props.router.push('/');
  };

  componentDidMount() {
    const { router, user } = this.props;

    if (!isEmpty(router.query)) {
      const { board, token, email, email_token } = router.query;

      if (
        typeof board === 'string' &&
        typeof token === 'string' &&
        typeof email === 'string'
      ) {
        this.setState({ board, token, email });
      } else if (typeof email_token === 'string') {
        this.setState({ email_token });
      }
    }

    if (user) this.setState({ willLogIn: true });
  }

  componentDidUpdate(prevProps: Props) {
    const { router, user } = this.props;

    // If invitation query params are available, handle them
    if (isEmpty(prevProps.router.query) && !isEmpty(router.query)) {
      const { board, token, email, email_token } = router.query;

      if (
        typeof board === 'string' &&
        typeof token === 'string' &&
        typeof email === 'string'
      ) {
        return this.setState({ board, token, email });
      } else if (typeof email_token === 'string') {
        return this.setState({ email_token });
      }
    }
    
    // Once logged in
    if (user) {
      const { board, token, email, email_token } = this.state;

      // If coming from invitation page
      if (board && token && email) {
        // Redirect back to invitation page while logged in
        router.replace(
          `/invitation?board=${board}&token=${token}&email=${email}`);
      } else if (email_token) {
        // Redirect back to email verification page while logged in
        router.replace(`/verify_email?token=${email_token}`);
      } else {
        // Otherwise redirect to dashboard
        router.replace('/dashboard');
      }
    }
  }

  render() {
    const { router, user } = this.props;
    const { board, token, email } = this.state;

    let headerText = 'Log in';
    let inviteEmail = '';
    let inviteParams = '';

    if (board && token && email) {
      headerText = 'Log in to accept invitation';
      inviteParams = `?board=${board}&token=${token}&email=${email}`;

      if (typeof router.query.email === 'string') {
        inviteEmail = decodeURIComponent(router.query.email);
      }
    }

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
        name: "Login",
        item: "https://simplekanban.app/login"
      }
    ];

    const breadcrumb = JSON.stringify({
      "@context": "https://schema.org/",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbList
    });
    
    return !!user ? <LoadingView /> : (
      <>
        <Head>
          <title>Login - SimpleKanban</title>
          <script type="application/ld+json">{breadcrumb}</script>
        </Head>
        <main className='Page Page--login'>
          <div className='LeftArrowIcon-container'>
            <LeftArrowIcon
              onClick={this.handleBack}
              src='/left-arrow-wh.png'
              type='button'
              title='Back to home'
            />
          </div>
          <h2>{headerText}</h2>
          <LoginForm initial_email={inviteEmail} />
          <span className='LoginLink LoginLink--register'>
            Don&apos;t have an account?&nbsp;
            <Link href={`/register${inviteParams}`}>
              <a className='LoginLink-link'>
                Sign up
              </a>
            </Link>
          </span>
          <span className='ForgotPassword-link'>
            <Link href='/forgot_password'>
              <a>Forgot your password?</a>
            </Link>
          </span>
          <span className='LoginLink LoginLink--login'>
            Stay on same page?&nbsp;
            <Link href='/login'>
              <a className='LoginLink-link'>Log in</a>
            </Link>
          </span>
          <div className='Footer Footer--login'>
            <div className='FooterLinks'>
              <span>&copy; 2022</span>
              &nbsp;&nbsp;&bull;&nbsp;&nbsp;
              <Link href={{ pathname: '/privacy' }}>
                <a className='FooterLink FooterLink--privacy'>Privacy Policy</a>
              </Link>
              &nbsp;&nbsp;&bull;&nbsp;&nbsp;
              <Link href={{ pathname: '/terms' }}>
                <a className='FooterLink FooterLink--terms'>Terms and Conditions</a>
              </Link>
            </div>
          </div>
        </main>
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
  email_token: string;
  willLogIn: boolean;
}

export default withRouter(connector(Login));