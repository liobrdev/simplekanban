import React, { Component, MouseEvent } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import isEmpty from 'lodash/isEmpty';

import Head from 'next/head';
import Link from 'next/link';
import { withRouter, NextRouter } from 'next/router';

import { LeftArrowIcon, LoadingView, ResetPasswordForm } from '@/components';
import { AppState, IBreadcrumbListItem } from '@/types';


class ResetPassword extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { token: '' };
    this.handleBack = this.handleBack.bind(this);
  }

  handleBack(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    this.props.router.push('/login');
  };

  componentDidMount() {
    // If logged in redirect to dashboard
    if (this.props.user) this.props.router.replace('/dashboard');
  }

  componentDidUpdate(prevProps: Props) {
    // If logged in redirect to dashboard
    if (this.props.user) {
      this.props.router.replace('/dashboard');
    }

    // Once query params are available, set this.state.token
    if (
      isEmpty(prevProps.router.query) &&
      !isEmpty(this.props.router.query)
    ) {
      const { token } = this.props.router.query;
      if (typeof token === 'string') this.setState({ token });
    }
  }

  render() {
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
        name: "Reset Password",
        item: "https://simplekanban.app/reset_password"
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
          <title>Reset Password - SimpleKanban</title>
          <link rel='canonical' href='https://simplekanban.app/login' />
          <meta name='robots' content='noindex, nofollow' />
          <script type='application/ld+json'>{breadcrumb}</script>
        </Head>
        <main className='Page Page--resetPassword'>
          <div className='LeftArrowIcon-container'>
            <LeftArrowIcon
              onClick={this.handleBack}
              src='/left-arrow-wh.png'
              type='button'
              title='Back to login'
            />
          </div>
          <h2>Reset your password</h2>
          <ResetPasswordForm token={this.state.token} />
          <span className='ResetPasswordLink'>
            Stay on same page?&nbsp;
            <Link href='/reset_password'>
              <a className='ResetPasswordLink-link'>Reset password</a>
            </Link>
          </span>
          <div className='Footer Footer--resetPassword'>
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
  token: string;
}

export default withRouter(connector(ResetPassword));