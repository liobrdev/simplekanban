import React, { Component, ReactNode } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import Head from 'next/head';

import { AppState } from '@/types';

import { LogoutUser, RetrieveUser } from './';


const description =
  "Easy-to-use, interactive Kanban boards for all of your projects.";

class RootComponent extends Component<Props> {
  render() {
    return (
      <>
        <Head>
          <meta charSet="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, shrink-to-fit=no"
          />
          <link
            rel="shortcut icon"
            type="image/x-icon"
            sizes="48x48"
            href="/favicon.ico"
          />
          <link
            rel="apple-touch-icon"
            type="image/png"
            sizes="180x180"
            href="/apple-touch-icon.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href="/favicon-32x32.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href="/favicon-16x16.png"
          />
          <link rel="manifest" href="/site.webmanifest" />
          <meta name="msapplication-TileColor" content="#DF2E2E" />
          <meta name="theme-color" content="#DF2E2E" />
          <meta itemProp="name" content="SimpleKanban" />
          <meta itemProp="description" content={description} />
          <meta name="description" content={description} />
          <meta property="og:title" content="SimpleKanban" />
          <meta property="og:type" content="website" />
          <meta property="og:url" content="https://simplekanban.app/" />
          <meta property="og:description" content={description} />
        </Head>
        <div className='SiteContainer'>
          <RetrieveUser />
          {!!this.props.user && <LogoutUser />}
          {this.props.children}
        </div>
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
  children: ReactNode;
}

export default connector(RootComponent);