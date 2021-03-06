import React, { Component, MouseEvent } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import Head from 'next/head';
import Link from 'next/link';
import { withRouter, NextRouter } from 'next/router';

import { LeftArrowIcon, LoadingView, ForgotPasswordForm } from '@/components';
import { AppState, IBreadcrumbListItem } from '@/types';


class ForgotPassword extends Component<Props> {
  constructor(props: Props) {
    super(props);
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
    if (this.props.user && !prevProps.user) {
      this.props.router.replace('/dashboard');
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
        name: "Forgot Password",
        item: "https://simplekanban.app/forgot_password"
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
          <title>Forgot Password - SimpleKanban</title>
          <link rel="canonical" href="https://simplekanban.app/login" />
          <meta name='robots' content='noindex, nofollow' />
          <script type="application/ld+json">{breadcrumb}</script>
        </Head>
        <main className='Page Page--forgotPassword'>
          <div className='LeftArrowIcon-container'>
            <LeftArrowIcon
              onClick={this.handleBack}
              src='/left-arrow-wh.png'
              type='button'
              title='Back to login'
            />
          </div>
          <h2>Forgot your password?</h2>
          <ForgotPasswordForm />
          <span className='ForgotPasswordLink'>
            Stay on same page?&nbsp;
            <Link href='/forgot_password'>
              <a className='ForgotPasswordLink-link'>Forgot password</a>
            </Link>
          </span>
          <div className='Footer Footer--forgotPassword'>
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

export default withRouter(connector(ForgotPassword));