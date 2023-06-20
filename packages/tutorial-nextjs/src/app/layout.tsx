import './globals.css';

export const metadata = {
  title: 'AI.JSX Next.js App Demo',
  description: 'A simple demo of using AI.JSX in a Next.js app.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
