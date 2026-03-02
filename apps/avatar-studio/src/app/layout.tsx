import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HoloLand Avatar Studio',
  description:
    'Create, customize, and export interoperable VRM avatars. The open alternative to Ready Player Me.',
  openGraph: {
    title: 'HoloLand Avatar Studio',
    description:
      'Create, customize, and export interoperable VRM avatars for any platform.',
    siteName: 'HoloLand',
    type: 'website',
    url: 'https://studio.hololand.io',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
