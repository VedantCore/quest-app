'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import TaskManagement from '@/components/admin/TaskManagement';
import ManagerList from '@/components/admin/ManagerList';
import UserList from '@/components/admin/UserList';
import Stats from '@/components/admin/Stats';
import Navbar from '@/components/Navbar';
import {
  getCompaniesAction,
  getCompanyUsersAction,
  bulkAssignUsersToCompanyAction,
} from '@/app/company-actions';
import toast from 'react-hot-toast';
import { useLocale } from '@/context/LocaleContext';

export default function CompanyDetailPage({ params }) {
  const { t } = useLocale();
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('tasks');
  const [company, setCompany] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const { id: companyId } = use(params);

  // User assignment state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!loading && (!user || userRole !== 'admin')) {
      router.push('/');
    }
  }, [user, userRole, loading, router]);

  useEffect(() => {
    const fetchCompany = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const result = await getCompaniesAction(token);
        if (result.success) {
          const foundCompany = result.data.find(
            (c) => c.company_id === companyId,
          );
          setCompany(foundCompany);
        }
      } catch (error) {
        console.error('Error fetching company:', error);
      } finally {
        setLoadingCompany(false);
      }
    };

    if (user && userRole === 'admin') {
      fetchCompany();
    }
  }, [user, userRole, companyId]);

  // Fetch all users and company users when modal opens
  const handleOpenAssignModal = async () => {
    setShowAssignModal(true);
    setLoadingUsers(true);

    try {
      const token = await user.getIdToken();

      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (usersError) throw usersError;
      setAllUsers(usersData || []);

      // Fetch current company users
      const result = await getCompanyUsersAction(token, companyId);
      if (result.success) {
        setCompanyUsers(result.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(t('admin.company.errorLoadUsers'));
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleBulkAssign = async (e) => {
    e.preventDefault();
    if (selectedUsers.length === 0) {
      toast.error(t('admin.company.selectAtLeastOneUser'));
      return;
    }

    try {
      const token = await user.getIdToken();
      const result = await bulkAssignUsersToCompanyAction(
        token,
        selectedUsers,
        companyId,
      );

      if (result.success) {
        toast.success(
          t('admin.company.bulkAssignSuccess', {
            count: selectedUsers.length,
            companyName: company.name,
          }),
        );
        setShowAssignModal(false);
        setSelectedUsers([]);
        // Refresh the page to show new users
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error assigning users:', error);
      toast.error(t('admin.company.errorAssignUsers'));
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  if (loading || loadingCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || userRole !== 'admin' || !company) {
    return null;
  }

  const tabs = [
    {
      id: 'tasks',
      label: 'Tasks',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
    },
    {
      id: 'managers',
      label: 'Managers',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      id: 'user-list',
      label: 'Users',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      id: 'stats',
      label: 'Statistics',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen font-sans text-gray-900">
      <Navbar />

      {/* Header with Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <nav className="flex items-center text-sm text-gray-500 mb-4">
            <button
              onClick={() => router.push('/admin-dashboard')}
              className="hover:text-indigo-600 transition-colors"
            >
              Admin Dashboard
            </button>
            <svg
              className="w-4 h-4 mx-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span className="text-gray-900 font-medium">{company.name}</span>
          </nav>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {company.name}
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                {company.description || 'No description provided'}
              </p>
            </div>
            <button
              onClick={handleOpenAssignModal}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Assign Users
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 border-b border-gray-200 overflow-x-auto">
          <nav className="-mb-px flex space-x-8 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2
                  ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="min-h-[400px]">
          {activeTab === 'tasks' && (
            <TaskManagement companyId={companyId} companyName={company.name} />
          )}
          {activeTab === 'managers' && <ManagerList companyId={companyId} />}
          {activeTab === 'user-list' && <UserList companyId={companyId} />}
          {activeTab === 'stats' && <Stats companyId={companyId} />}
        </div>
      </div>

      {/* Assign Users Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold">
                {t('admin.company.assignTo', { companyName: company.name })}
              </h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedUsers([]);
                  setSearchTerm('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {loadingUsers ? (
              <div className="flex-grow flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <form
                onSubmit={handleBulkAssign}
                className="flex-grow flex flex-col overflow-hidden"
              >
                <div className="p-6">
                  <input
                    type="text"
                    placeholder={t('common.placeholders.searchUsers')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex-grow overflow-y-auto px-6 space-y-2">
                  {allUsers
                    .filter(
                      (u) =>
                        u.name
                          ?.toLowerCase()
                          .includes(searchTerm.toLowerCase()) ||
                        u.email
                          ?.toLowerCase()
                          .includes(searchTerm.toLowerCase()),
                    )
                    .map((u) => {
                      const alreadyAssigned = companyUsers.some(
                        (cu) => cu.users?.user_id === u.user_id,
                      );
                      return (
                        <label
                          key={u.user_id}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                            alreadyAssigned
                              ? 'bg-gray-100 opacity-60 cursor-not-allowed'
                              : 'hover:bg-indigo-50'
                          } ${
                            selectedUsers.includes(u.user_id)
                              ? 'bg-indigo-50 border-indigo-300'
                              : 'border-gray-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(u.user_id)}
                            onChange={() => toggleUserSelection(u.user_id)}
                            disabled={alreadyAssigned}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-4"
                          />
                          <div>
                            <p className="font-medium text-gray-800">
                              {u.name || u.email}
                            </p>
                            {u.name && (
                              <p className="text-sm text-gray-500">{u.email}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 font-medium rounded-full">
                                {u.role}
                              </span>
                              {alreadyAssigned && (
                                <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                  {t('admin.company.alreadyAssigned')}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                </div>

                <div className="flex gap-4 justify-end p-6 border-t bg-gray-50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedUsers([]);
                      setSearchTerm('');
                    }}
                    className="px-5 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 font-semibold text-sm"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed font-semibold text-sm"
                    disabled={selectedUsers.length === 0}
                  >
                    {t('admin.company.assignUsers', {
                      count: selectedUsers.length,
                    })}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
