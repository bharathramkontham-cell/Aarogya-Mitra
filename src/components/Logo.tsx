import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2.5 font-bold text-white ${className}`}
      aria-label="Aarogya Mitra home"
    >
      <span
        aria-hidden="true"
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/30"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-6 w-6 text-white drop-shadow"
          aria-hidden="true"
        >
          <path
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            d="M12 21c-4.6 0-8-2.5-8-7 0-3 2-5.2 3.3-6.2.7-.5 1.7-.5 2.4 0 1.3 1 3.3 3.2 3.3 6.2 0 4.5-3.4 7-8 7z"
          />
          <path
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            d="M9 11.5v3M12 12v2.5M15 11.5v3"
          />
          <path
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            d="M8 7h8M9.5 6.2h5"
          />
        </svg>
      </span>        <span className="inline-flex flex-col tracking-tight app-logo-telegu">
        <span className="text-xl leading-none text-blue-700">
          ఆరోగ్య మిత్ర
        </span>
        <span className="text-[10px] leading-tight font-semibold tracking-widest uppercase text-slate-500">
          Aarogya Mitra
        </span>
      </span>
    </Link>
  );
}
