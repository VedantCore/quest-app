'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import toast from 'react-hot-toast';
import {
  getCompanyUsersForManagerAction,
  removeUserFromCompanyByManagerAction,
} from '@/app/company-actions';

export default function CompanyUserManagement({ companyId, companyName }) {
  const { user } = useAuth();
  const { t } = useLocale();
  const [companyUsers, setCompanyUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (companyId && user) {
      fetchCompanyUsers();
    }
  }, [companyId, user]);

  const fetchCompanyUsers = async () => {
    try {
      const token = await user.getIdToken();
      const result = await getCompanyUsersForManagerAction(token, companyId);

      if (result.success) {
        setCompanyUsers(result.data || []);
      } else {
        toast.error(result.error || 'Failed to load company users');
      }
    } catch (error) {
      console.error('Error fetching company users:', error);
      toast.error('Failed to load company users');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async (userId, userName) => {
    if (
      !confirm(
        `Are you sure you want to remove ${userName} from ${companyName}?`
      )
    ) {
      return;
    }

    try {
      const token = await user.getIdToken();
      const result = await removeUserFromCompanyByManagerAction(
        token,
        userId,
        companyId
      );

      if (result.success) {
        toast.success('User removed successfully');
        setCompanyUsers(companyUsers.filter((cu) => cu.user_id !== userId));
      } else {
        toast.error(result.error || 'Failed to remove user');
      }
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error('Failed to remove user');
    }
  };

  const filteredUsers = companyUsers.filter((cu) => {
    const query = searchQuery.toLowerCase();
    return (
      cu.users.name?.toLowerCase().includes(query) ||
      cu.users.email?.toLowerCase().includes(query)
    );
  });

  const usersByRole = filteredUsers.reduce(
    (acc, cu) => {
      const role = cu.users.role || 'user';
      if (!acc[role]) acc[role] = [];
      acc[role].push(cu);
      return acc;
    },
    { manager: [], user: [] }
  );

  // Sort by points within each role
  Object.keys(usersByRole).forEach((role) => {
    usersByRole[role].sort(
      (a, b) => (b.users.total_points || 0) - (a.users.total_points || 0)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {t('manager.company.companyUsers') || 'Company Users'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {companyUsers.length} {companyUsers.length === 1 ? 'user' : 'users'}
          </p>
        </div>

        <div className="w-64">
          <input
            type="text"
            placeholder={t('common.search') || 'Search users...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {companyUsers.length === 0 ? (
        <p className="text-center text-gray-500 py-8">
          {t('manager.company.noUsersFound') || 'No users in this company'}
        </p>
      ) : (
        <div className="space-y-6">
          {/* Managers Section */}
          {usersByRole.manager && usersByRole.manager.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                {t('common.manager') || 'Managers'} (
                {usersByRole.manager.length})
              </h4>
              <div className="space-y-2">
                {usersByRole.manager.map((cu) => (
                  <div
                    key={cu.user_id}
                    className="flex items-center justify-between p-4 border border-indigo-200 bg-indigo-50 rounded-lg"
                  >
                    <Link
                      href={`/user/${cu.user_id}`}
                      className="flex items-center gap-4 group cursor-pointer flex-1"
                    >
                      <div className="w-12 h-12 rounded-full bg-indigo-200 flex items-center justify-center flex-shrink-0">
                        {cu.users.avatar_url ? (
                          <img
                            src={cu.users.avatar_url}
                            alt={cu.users.name}
                            className="w-12 h-12 rounded-full object-cover group-hover:ring-2 group-hover:ring-indigo-400 transition-all"
                          />
                        ) : (
                          <span className="text-lg font-bold text-indigo-700">
                            {cu.users.name?.charAt(0).toUpperCase() || 'M'}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {cu.users.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {cu.users.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-1 bg-indigo-600 text-white rounded">
                            {t('common.manager') || 'Manager'}
                          </span>
                          <span className="text-xs text-gray-600">
                            {cu.users.total_points || 0} pts
                          </span>
                        </div>
                      </div>
                    </Link>
                    <div className="text-sm text-gray-500 italic">
                      {t('manager.company.cannotRemove') ||
                        'Contact admin to remove'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users Section */}
          {usersByRole.user && usersByRole.user.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                {t('common.user') || 'Users'} ({usersByRole.user.length})
              </h4>
              <div className="space-y-2">
                {usersByRole.user.map((cu) => (
                  <div
                    key={cu.user_id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <Link
                      href={`/user/${cu.user_id}`}
                      className="flex items-center gap-4 group cursor-pointer flex-1"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        {cu.users.avatar_url ? (
                          <img
                            src={cu.users.avatar_url}
                            alt={cu.users.name}
                            className="w-12 h-12 rounded-full object-cover group-hover:ring-2 group-hover:ring-indigo-400 transition-all"
                          />
                        ) : (
                          <span className="text-lg font-bold text-gray-600">
                            {cu.users.name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {cu.users.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {cu.users.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                            {t('common.user') || 'User'}
                          </span>
                          <span className="text-xs text-gray-600">
                            {cu.users.total_points || 0} pts
                          </span>
                        </div>
                      </div>
                    </Link>
                    <button
                      onClick={() =>
                        handleRemoveUser(cu.user_id, cu.users.name)
                      }
                      className="px-4 py-2 text-red-600 hover:bg-red-50 border border-red-300 rounded-lg transition-colors font-medium text-sm"
                    >
                      {t('admin.company.remove') || 'Remove'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
