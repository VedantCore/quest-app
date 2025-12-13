import { Geist, Geist_Mono } from 'next/font/google';
import { AuthProvider } from '../context/AuthContext';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata = {
  title: 'Quest App',
  description: 'Project Management for Modern Teams',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-white relative font-sans text-slate-800`}
      >
        {/* Grid Background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.6] pointer-events-none z-0" />

        <div className="relative z-10">
          <AuthProvider>
            <Toaster position="top-right" />
            {children}
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
