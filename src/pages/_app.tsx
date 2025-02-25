import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';

function suppressHydrationWarning() {
  if (typeof window !== 'undefined') {
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0] && args[0].includes && args[0].includes('Warning: Did not expect server HTML to contain')) {
        return;
      }
      if (args[0] && args[0].includes && args[0].includes('Hydration failed because')) {
        return;
      }
      originalError.apply(console, args);
    };
  }
}

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  useEffect(() => {
    suppressHydrationWarning();
  }, []);
  
  return <Component {...pageProps} />;
} 