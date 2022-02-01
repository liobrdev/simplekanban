import React, { Component } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import Head from 'next/head';
import Link from 'next/link';
import { withRouter, NextRouter } from 'next/router';

import { LoadingView } from '@/components';
import { AppState, IBreadcrumbListItem } from '@/types';


class Home extends Component<Props> {
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
          <title>SimpleKanban</title>
          <script type="application/ld+json">{breadcrumb}</script>
        </Head>
        <main className='Page Page--home'>
          <h1>SimpleKanban</h1>
          <h2>
            Easy-to-use, interactive Kanban boards for all of your projects
          </h2>
          <div className='HomeLinks'>
            <Link href={{ pathname: '/register' }}>
              <a className='HomeLink HomeLink--register'>Sign up</a>
            </Link>
            <Link href={{ pathname: '/login' }}>
              <a className='HomeLink HomeLink--login'>Log in</a>
            </Link>
          </div>
          <div className='Footer Footer--home'>
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

export default withRouter(connector(Home));