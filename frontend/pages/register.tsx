import React, { Component, MouseEvent } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import Head from 'next/head';
import Link from 'next/link';
import { withRouter, NextRouter } from 'next/router';

import { LeftArrowIcon, LoadingView, RegisterForm } from '@/components';
import { AppState, IBreadcrumbListItem } from '@/types';
import { getInviteQueryString } from '@/utils';


class Register extends Component<Props> {
  private queryString?: ReturnType<typeof getInviteQueryString>;

  constructor(props: Props) {
    super(props);
    this.queryString = getInviteQueryString(props.router.query);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    this.props.router.push('/');
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
    let headerText = 'Register';
    let invite_email = '';

    if (this.queryString) {
      headerText = 'Create an account to accept invitation';
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
        name: "Register",
        item: "https://simplekanban.app/register"
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
          <title>Register - SimpleKanban</title>
          <link rel="canonical" href="https://simplekanban.app/login" />
          <script type="application/ld+json">{breadcrumb}</script>
        </Head>
        <main className='Page Page--register'>
          <div className='LeftArrowIcon-container'>
            <LeftArrowIcon
              onClick={this.handleClick}
              src='/left-arrow-wh.png'
              type='button'
              title='Back to home'
            />
          </div>
          <h2>{headerText}</h2>
          <RegisterForm initial_email={invite_email} />
          <span className='RegisterLink RegisterLink--login'>
            Already have an account?&nbsp;
            <Link href={`/login${this.queryString}`}>
              <a className='RegisterLink-link'>
                Log in
              </a>
            </Link>
          </span>
          <span className='RegisterLink RegisterLink--register'>
            Stay on same page?&nbsp;
            <Link href='/register'>
              <a className='RegisterLink-link'>Sign up</a>
            </Link>
          </span>
          <div className='Footer Footer--register'>
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

export default withRouter(connector(Register));