'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import TaskManagement from '@/components/admin/TaskManagement';
import ManagerList from '@/components/admin/ManagerList';
import UserList from '@/components/admin/UserList';
import Stats from '@/components/admin/Stats';
import Navbar from '@/components/Navbar';
import { getCompaniesAction } from '@/app/company-actions';

export default function CompanyDetailPage({ params }) {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('tasks');
  const [company, setCompany] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const { id: companyId } = use(params);

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
            (c) => c.company_id === companyId
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
          <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
          <p className="mt-2 text-sm text-gray-500">
            {company.description || 'No description provided'}
          </p>
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
    </div>
  );
}
