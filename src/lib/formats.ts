import React from 'react';
import * as ReactDOM from 'react-dom/client';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-teal-700 text-teal-800 flex flex-col min-h-screen">
      <header className="p-4 bg-teal-600 text-white shadow-md">
        <nav className="flex items-center justify-between max-w-6xl mx-auto flex-wrap gap-2">
          <a href="/" className="flex items-center gap-2 text-xl font-semibold hover:underline">
            <img src="/aarogya-mitra.svg" alt="Aarogya Mitra" className="h-10" />
            <span>Aarogya Mitra</span>
          </a>
          <div className="flex gap-2">
            <a href="/" className="px-4 py-2 rounded-md border border-white/20 hover:bg-white/10 text-sm font-medium">Home</a>
            <a href="/" className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-sm font-medium text-white">Landing</a>
            <a href="/demo/" className="px-4 py-2 rounded-md bg-primary-500 hover:bg-primary-600 text-sm font-medium text-white">Demo</a>
            <a href="/demo/auth" className="px-4 py-2 rounded-md bg-primary-500 hover:bg-primary-600 text-sm font-medium text-white">Sign In</a>
            <a href="/demo/auth/sign-up" className="px-4 py-2 rounded-md border border-white/20 hover:bg-white/10 text-sm font-medium">Sign Up</a>
            <a href="/demo/profile" className="px-4 py-2 rounded-md border border-white/20 hover:bg-white/10 text-sm font-medium">Profile</a>
            <a href="/demo/feedback" className="px-4 py-2 rounded-md border border-white/20 hover:bg-white/10 text-sm font-medium">Feedback</a>
          </div>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto w-full">
        {children}
      </main>

      <footer className="p-4 bg-black text-white text-center text-sm">
        Aarogya Mitra &mdash; made with care
      </footer>
    </div>
  );
}
