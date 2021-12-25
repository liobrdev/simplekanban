import React, { Component, MouseEvent } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import Head from 'next/head';
import Link from 'next/link';
import { withRouter, NextRouter } from 'next/router';

import { LeftArrowIcon, LoadingView, LoginForm } from '@/components';
import { AppState, IBreadcrumbListItem } from '@/types';
import { getInviteQueryString } from '@/utils';


class Login extends Component<Props> {
  private queryString?: ReturnType<typeof getInviteQueryString>;

  constructor(props: Props) {
    super(props);
    this.queryString = getInviteQueryString(props.router.query);
    this.handleBack = this.handleBack.bind(this);
    this.handleForgotPassword = this.handleForgotPassword.bind(this);
  }

  handleBack(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    this.props.router.push('/');
  };

  handleForgotPassword(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    this.props.router.push('/forgot_password');
  };

  componentDidUpdate(prevProps: Props) {
    // If logged in
    if (this.props.user) {
      // If coming from invitation page
      if (this.queryString) {
        // Redirect back to invitation page while logged in
        this.props.router.replace(`/invitation${this.queryString}`);
      } else {
        // Otherwise redirect to dashboard
        this.props.router.replace('/dashboard');
      }
    }
  }

  render() {
    let headerText = 'Log in';
    let invite_email = '';

    if (this.queryString) {
      headerText = 'Log in to accept invitation';
      if (typeof this.props.router.query.email === 'string') {
        invite_email = decodeURIComponent(this.props.router.query.email);
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
    
    return !!this.props.user ? <LoadingView /> : (
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
          <LoginForm initial_email={invite_email} />
          <span className='LoginLink'>
            Don&apos;t have an account?&nbsp;
            <Link href={`/register${this.queryString}`}>
              <a className='LoginLink-link'>
                Sign up
              </a>
            </Link>
          </span>
          <button
            className='ForgotPassword-button'
            type='button'
            onClick={this.handleForgotPassword}
          >
            Forgot your password?
          </button>
          <div className='Footer Footer--login' />
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

export default withRouter(connector(Login));