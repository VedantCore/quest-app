'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getUserCompanies } from '@/app/actions';
import Navbar from '@/components/Navbar';
import { useLocale } from '@/context/LocaleContext';
import { RankBadge } from '@/lib/rankUtils';

export default function ManagerDashboard() {
  const { t } = useLocale();
  const { user, userRole, userData, loading } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && (!user || userRole !== 'manager')) {
      router.push('/');
    } else if (user && userRole === 'manager') {
      fetchCompanies();
    }
  }, [user, userRole, loading, router]);

  const fetchCompanies = async () => {
    setIsLoadingData(true);
    try {
      const result = await getUserCompanies(user.uid);
      if (result.success) {
        setCompanies(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  if (loading || isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || userRole !== 'manager') return null;

  return (
    <div className="min-h-screen font-sans text-gray-900 bg-white">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('manager.dashboard.title')}
            </h1>
            <p className="text-sm text-gray-500">
              {t('manager.dashboard.welcome', {
                name:
                  userData?.name ||
                  user?.displayName ||
                  user?.email ||
                  t('manager.dashboard.managerFallback'),
              })}
            </p>
          </div>
          <div className="flex-shrink-0">
            <RankBadge points={userData?.total_points} role={userRole} />
          </div>
        </div>
      </div>

      {/* Company Cards */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* My Quests Section */}
        <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl border border-green-200 p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {t('manager.dashboard.myQuests')}
              </h3>
              <p className="text-sm text-gray-600">
                {t('manager.dashboard.viewParticipatingQuests')}
              </p>
            </div>
            <button
              onClick={() => router.push('/user-dashboard')}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 whitespace-nowrap"
            >
              {t('manager.dashboard.viewMyQuests')}
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Browse Available Tasks Section */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {t('manager.dashboard.participateInTasks')}
              </h3>
              <p className="text-sm text-gray-600">
                {t('manager.dashboard.browseAndJoinTasks')}
              </p>
            </div>
            <button
              onClick={() => router.push('/tasks')}
              className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 whitespace-nowrap"
            >
              {t('manager.dashboard.browseQuests')}
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
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </button>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {t('manager.dashboard.companiesManaged')}
        </h2>
        {companies.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 text-gray-300 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">
              {t('manager.dashboard.noCompanies')}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {t('manager.dashboard.contactAdmin')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <div
                key={company.company_id}
                onClick={() =>
                  router.push(
                    `/manager-dashboard/company/${company.company_id}`
                  )
                }
                className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all duration-200 cursor-pointer group"
              >
                <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  {company.name}
                </h3>
                <p className="text-sm text-gray-600 min-h-[40px]">
                  {company.description || t('manager.dashboard.noDescription')}
                </p>
                <div className="mt-4 flex items-center text-sm text-indigo-600 font-medium group-hover:translate-x-1 transition-transform">
                  {t('manager.dashboard.viewTasks')}
                  <svg
                    className="w-4 h-4 ml-1"
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
