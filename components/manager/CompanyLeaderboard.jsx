'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/context/LocaleContext';
import { RankBadge } from '@/lib/rankUtils';

export default function CompanyLeaderboard({ companyId }) {
  const { t } = useLocale();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      fetchLeaderboard();
    }
  }, [companyId]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      // Fetch users for this company via join
      const { data, error } = await supabase
        .from('user_companies')
        .select(
          `
          user_id,
          users!user_companies_user_id_fkey (
            user_id,
            name,
            email,
            role,
            avatar_url,
            total_points
          )
        `
        )
        .eq('company_id', companyId);

      if (error) throw error;

      // Flatten and filter for regular users only
      const leaderboardUsers = data
        .map((item) => item.users)
        .filter((u) => u && u.role === 'user')
        .sort((a, b) => (b.total_points || 0) - (a.total_points || 0));

      setUsers(leaderboardUsers);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalColor = (index) => {
    switch (index) {
      case 0:
        return 'text-yellow-500 bg-yellow-50 border-yellow-200'; // Gold
      case 1:
        return 'text-gray-400 bg-gray-50 border-gray-200'; // Silver
      case 2:
        return 'text-amber-600 bg-amber-50 border-amber-200'; // Bronze
      default:
        return 'text-gray-500 bg-white border-transparent';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
        <p className="text-gray-500 text-sm">{t('common.loading')}</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <div className="mx-auto h-12 w-12 text-gray-300 mb-4">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">
          {t('manager.company.noUsersFound')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">
                {t('manager.company.rank')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t('manager.company.user')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t('manager.company.level')}
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t('manager.company.points')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user, index) => (
              <tr
                key={user.user_id}
                className={`hover:bg-gray-50/50 transition-colors ${
                  index < 3 ? 'bg-gradient-to-r from-gray-50/30 to-transparent' : ''
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div
                    className={`nav-number flex items-center justify-center w-8 h-8 rounded-full border text-sm font-bold ${getMedalColor(
                      index
                    )}`}
                  >
                    {index + 1}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name}
                        className="h-10 w-10 rounded-full object-cover border border-gray-200 shadow-sm"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-bold border border-indigo-200">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">
                        {user.name || t('manager.company.unknownUser')}
                      </span>
                      <span className="text-xs text-gray-500">{user.email}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <RankBadge points={user.total_points} role="user" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {user.total_points?.toLocaleString() || 0} {t('common.pts')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
