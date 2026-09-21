import type { AppProps } from 'next/app';
import Head from 'next/head';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../contexts/AuthContext';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>NikahConnect — Responsible Matchmaking</title>
        <meta name="description" content="A dignified, privacy-first platform for finding your life partner." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <AuthProvider>
        <Component {...pageProps} />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              borderRadius: '10px',
              border: '1px solid rgba(200,149,108,0.2)',
            },
            success: { iconTheme: { primary: '#4A9E4A', secondary: 'white' } },
          }}
        />
      </AuthProvider>
    </>
  );
}
