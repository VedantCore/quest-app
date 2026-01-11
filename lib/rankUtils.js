import React from 'react';

export const getRank = (points) => {
  if (points > 10000000)
    return {
      name: 'God',
      range: '10,000,001+',
      classes:
        'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white ring-2 ring-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.6)] animate-pulse',
      icon: (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    };
  if (points > 5000000)
    return {
      name: 'Black',
      range: '5,000,001 - 10,000,000',
      classes:
        'bg-gradient-to-r from-gray-900 to-black text-white shadow-lg border border-gray-700',
      icon: (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    };
  if (points > 3000000)
    return {
      name: 'Diamond',
      range: '3,000,001 - 5,000,000',
      classes:
        'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-md',
      icon: (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 9v6l-8 5l-8-5V9l8-5l8 5z"
          />
        </svg>
      ),
    };
  if (points > 1000000)
    return {
      name: 'Platinum',
      range: '1,000,001 - 3,000,000',
      classes:
        'bg-gradient-to-r from-slate-100 to-slate-300 text-slate-800 border border-slate-400 shadow-sm',
      icon: (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    };
  if (points > 500000)
    return {
      name: 'Gold',
      range: '500,001 - 1,000,000',
      classes:
        'bg-gradient-to-r from-yellow-300 to-yellow-500 text-yellow-900 border border-yellow-400',
      icon: (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
          />
        </svg>
      ),
    };
  if (points > 100000)
    return {
      name: 'Silver',
      range: '100,001 - 500,000',
      classes:
        'bg-gradient-to-r from-slate-200 to-slate-400 text-slate-800 border border-slate-300',
      icon: (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    };
  if (points > 10000)
    return {
      name: 'Bronze',
      range: '10,001 - 100,000',
      classes:
        'bg-gradient-to-r from-amber-700 to-amber-900 text-amber-100 border border-amber-800',
      icon: (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    };
  return {
    name: 'Blue',
    range: '0 - 10,000',
    classes: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
    icon: (
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
    ),
  };
};

export const RankBadge = ({ points, role }) => {
  if (role !== 'user') return null;

  const rank = getRank(points || 0);

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <span
        title={`${rank.name} (${rank.range})`}
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full shadow-sm transition-all hover:scale-110 cursor-default ${rank.classes}`}
      >
        {rank.icon}
      </span>
      <span className="text-[10px] font-medium text-gray-600 whitespace-nowrap">
        {rank.name}
      </span>
    </div>
  );
};
