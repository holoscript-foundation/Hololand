import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HoloShell',
  description: 'The natural phenomena OS — no learned behaviors, only touchable nature',
  openGraph: {
    title: 'HoloShell',
    description: 'The natural phenomena OS — no learned behaviors, only touchable nature',
    siteName: 'HoloLand',
    type: 'website',
    url: 'https://shell.hololand.io',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#05070f', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}
