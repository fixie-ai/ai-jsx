import { ThemeProvider } from '@/components/theme-provider';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata = {
  title: 'Fixie | Voice',
  description: 'A demo of native voice conversations on Fixie',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} font-sans`}>
      <body className="h-full">
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          <main className="flex min-h-screen flex-col items-start px-12 py-6 max-w-64">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
