import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'Hololand - Build the Open Metaverse',
  description:
    'Create immersive AR/VR experiences using React and natural language. No VR headset required to start. Build once, deploy everywhere.',
  keywords: [
    'VR',
    'AR',
    'metaverse',
    'WebXR',
    'React',
    'Three.js',
    'virtual reality',
    'augmented reality',
    'Hololand',
    'open metaverse',
  ],
  authors: [{ name: 'Hololand Community' }],
  openGraph: {
    title: 'Hololand - Build the Open Metaverse',
    description:
      'Create immersive AR/VR experiences using React and natural language. No VR headset required to start.',
    type: 'website',
    url: 'https://hololand.io',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hololand - Build the Open Metaverse',
    description:
      'Create immersive AR/VR experiences using React and natural language.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased bg-gray-900 text-white">
        {children}
      </body>
    </html>
  );
}
