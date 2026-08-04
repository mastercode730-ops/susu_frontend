import { AuthProvider } from '../context/AuthContext';
import Script from 'next/script';

export const metadata = {
  title: "Susu9 - Game Management Platform",
  description: "Susu9 backend client converted to Next.js",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Noto+Sans:wght@400;500;600&display=swap" />
        <link rel="stylesheet" href="/css/main.css" />
        <link rel="stylesheet" href="/vendor/assets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/vendor/assets/css/fonts.min.css" />
        <link rel="stylesheet" href="/vendor/assets/css/atlantis.min.css" />
        <link rel="stylesheet" href="/vendor/fonts/font-awesome-4.7.0/css/font-awesome.min.css" />
        <link rel="stylesheet" href="/vendor/Select/select2.css" />
        <link rel="stylesheet" href="/css/polish.css" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>

        {/* Load theme vendor scripts */}
        <Script src="/vendor/assets/js/core/jquery.3.2.1.min.js" strategy="beforeInteractive" />
        <Script src="/vendor/assets/js/core/popper.min.js" strategy="beforeInteractive" />
        <Script src="/vendor/assets/js/core/bootstrap.min.js" strategy="beforeInteractive" />
        <Script src="/vendor/assets/js/plugin/jquery-ui-1.12.1.custom/jquery-ui.min.js" strategy="lazyOnload" />
        <Script src="/vendor/assets/js/plugin/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js" strategy="lazyOnload" />
        <Script src="/vendor/assets/js/plugin/jquery-scrollbar/jquery.scrollbar.min.js" strategy="lazyOnload" />
        <Script src="/vendor/assets/js/plugin/sweetalert/sweetalert.min.js" strategy="beforeInteractive" />
        <Script src="/vendor/assets/js/atlantis.min.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
