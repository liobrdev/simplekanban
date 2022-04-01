import React, { Component, MouseEvent } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import isEmpty from 'lodash/isEmpty';

import Head from 'next/head';
import Link from 'next/link';
import { withRouter, NextRouter } from 'next/router';

import { LeftArrowIcon, LoadingView, RegisterForm } from '@/components';
import {
  AppDispatch,
  AppState,
  IBreadcrumbListItem,
  checkListBoard,
} from '@/types';
import { request } from '@/utils';


class Register extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      board: '',
      token: '',
      email: '',
      from: '',
      willLogIn: false,
    };
    this.handleBack = this.handleBack.bind(this);
    this.handleSubmitDemo = this.handleSubmitDemo.bind(this);
  }

  handleBack(
    e: MouseEvent<HTMLButtonElement>,
    ...pathname: Parameters<NextRouter['push']>
  ) {
    e.preventDefault();
    this.props.router.push(...pathname);
  };

  async handleSubmitDemo() {
    try {
      this.props.startSubmitDemo();
      const token = localStorage.getItem('simplekanban_token');
      const board = await request
        .post('/submit_demo/')
        .set({ 'Authorization': `Token ${token}` })
        .send({ ...this.props.board })
        .then((res) => checkListBoard(res.body, res));
      this.props.stopSubmitDemo();
      this.props.router.replace(`/board/${board.board.board_slug}`);
    } catch (err: any) {
      this.props.stopSubmitDemo();
      console.error(err);
      this.props.router.replace('/dashboard');
    }
  }

  componentDidMount() {
    const { router, user } = this.props;

    if (!isEmpty(router.query)) {
      const { board, token, email, from } = router.query;

      if (
        typeof board === 'string' &&
        typeof token === 'string' &&
        typeof email === 'string'
      ) {
        this.setState({ board, token, email });
      } else if (typeof from === 'string') {
        this.setState({ from });
      }
    }

    // Triggers re-render
    if (user) this.setState({ willLogIn: true });
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { router, user } = this.props;

    // If invitation query params are available, handle them
    if (isEmpty(prevProps.router.query) && !isEmpty(router.query)) {
      const { board, token, email, from } = router.query;

      if (
        typeof board === 'string' &&
        typeof token === 'string' &&
        typeof email === 'string'
      ) {
        return this.setState({ board, token, email });
      } else if (typeof from === 'string') {
        return this.setState({ from });
      }
    }

    const { willLogIn } = this.state;

    if ((user && !prevProps.user) || (willLogIn && !prevState.willLogIn)) {
      const { board, token, email, from } = this.state;

      if (board && token && email) {
        router.replace(
          `/invitation?board=${board}&token=${token}&email=${email}`);
      } else if (from === 'demo' && this.props.board?.board_slug === 'demo') {
        this.handleSubmitDemo();
      } else {
        router.replace('/dashboard');
      }
    }
  }

  render() {
    const { user, isSubmittingDemo } = this.props;
    const { board, token, email, from } = this.state;

    let headerText = 'Register';
    let inviteEmail = '';
    let params = '';

    if (board && token && email) {
      headerText = 'Create an account to accept invitation';
      params = `?board=${board}&token=${token}&email=${email}`;
      inviteEmail = decodeURIComponent(email);
    } else if (from) {
      params = `?from=${from}`;
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

    return !!user || isSubmittingDemo ? <LoadingView /> : (
      <>
        <Head>
          <title>Register - SimpleKanban</title>
          <link rel="canonical" href="https://simplekanban.app/login" />
          <script type="application/ld+json">{breadcrumb}</script>
        </Head>
        <main className='Page Page--register'>
          <div className='LeftArrowIcon-container'>
            <LeftArrowIcon
              onClick={e => this.handleBack(e, '/' + from)}
              src='/left-arrow-wh.png'
              type='button'
              title='Back'
            />
          </div>
          <h2>{headerText}</h2>
          <RegisterForm initial_email={inviteEmail} />
          <span className='RegisterLink RegisterLink--login'>
            Already have an account?&nbsp;
            <Link href={`/login${params}`}>
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
  board: state.board.board,
  isSubmittingDemo: state.board.isSubmittingDemo,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  startSubmitDemo: () => {
    dispatch({ type: 'START_SUBMIT_DEMO' });
  },
  stopSubmitDemo: () => {
    dispatch({ type: 'STOP_SUBMIT_DEMO' });
  },
})

const connector = connect(mapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface Props extends PropsFromRedux {
  router: NextRouter;
}

interface State {
  board: string;
  token: string;
  email: string;
  from: string;
  willLogIn: boolean;
}

export default withRouter(connector(Register));