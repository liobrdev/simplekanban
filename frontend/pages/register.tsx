import React, { Component, MouseEvent } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import isEmpty from 'lodash/isEmpty';

import Head from 'next/head';
import Link from 'next/link';
import { withRouter, NextRouter } from 'next/router';

import { LeftArrowIcon, LoadingView, RegisterForm } from '@/components';
import { AppState, IBreadcrumbListItem } from '@/types';


class Register extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { board: '', token: '', email: '', willLogIn: false };
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    this.props.router.push('/');
  };

  componentDidMount() {
    const { router, user } = this.props;

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

    if (user) this.setState({ willLogIn: true });
  }

  componentDidUpdate(prevProps: Props) {
    const { router, user } = this.props;

    // If invitation query params are available, handle them
    if (isEmpty(prevProps.router.query) && !isEmpty(router.query)) {
      const { board, token, email } = router.query;

      if (
        typeof board === 'string' &&
        typeof token === 'string' &&
        typeof email === 'string'
      ) {
        return this.setState({ board, token, email });
      }
    }
    
    // Once logged in
    if (user) {
      const { board, token, email } = this.state;

      // If coming from invitation page
      if (board && token && email) {
        // Redirect back to invitation page while logged in
        router.replace(
          `/invitation?board=${board}&token=${token}&email=${email}`);
      } else {
        // Otherwise redirect to dashboard
        router.replace('/dashboard');
      }
    }
  }

  render() {
    const { router, user } = this.props;
    const { board, token, email } = this.state;

    let headerText = 'Register';
    let inviteEmail = '';
    let inviteParams = '';

    if (board && token && email) {
      headerText = 'Create an account to accept invitation';
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
        name: "Register",
        item: "https://simplekanban.app/register"
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
          <RegisterForm initial_email={inviteEmail} />
          <span className='RegisterLink RegisterLink--login'>
            Already have an account?&nbsp;
            <Link href={`/login${inviteParams}`}>
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

interface State {
  board: string;
  token: string;
  email: string;
  willLogIn: boolean;
}

export default withRouter(connector(Register));