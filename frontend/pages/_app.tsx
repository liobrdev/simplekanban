import type { AppProps } from 'next/app';

import { Provider } from 'react-redux';

import { RootComponent } from '@/components';
import { store } from '@/store';

import '@/scss';


export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <RootComponent>
        <Component {...pageProps} />
      </RootComponent>
    </Provider>
  );
}