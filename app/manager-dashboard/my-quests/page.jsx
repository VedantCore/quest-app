'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import Navbar from '@/components/Navbar';
import TaskList from '@/components/user/TaskList';
import Profile from '@/components/user/Profile';

export default function ManagerQuestsPage() {
  const { user, userRole, loading } = useAuth();
  const { t } = useLocale();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('tasks');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!loading && (!user || userRole !== 'manager')) {
      router.push('/');
    }
  }, [user, userRole, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (userRole !== 'manager') return null;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/manager-dashboard')}
              className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors font-medium"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              {t('manager.company.breadcrumb')}
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('manager.myQuests.title')}
          </h1>
          <p className="text-gray-600">{t('manager.myQuests.subtitle')}</p>
        </div>

        {/* Stats Row */}
        {activeTab === 'tasks' && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 font-bold uppercase">
                {t('userDashboard.activeQuests')}
              </p>
              <p className="text-2xl font-bold text-indigo-600">
                {stats.activeTasks}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 font-bold uppercase">
                {t('userDashboard.completed')}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.completedTasks}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 font-bold uppercase">
                {t('userDashboard.totalPoints')}
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {stats.totalPoints}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs text-gray-500 font-bold uppercase">
                {t('userDashboard.progress')}
              </p>
              <p className="text-2xl font-bold text-orange-500">
                {stats.overallProgress}%
              </p>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="bg-white p-1 rounded-xl inline-flex border border-gray-200 shadow-sm mb-6">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'tasks'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {t('userDashboard.tabs.tasks')}
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'profile'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {t('userDashboard.tabs.profile')}
          </button>
        </div>

        {/* Main Content Area */}
        {activeTab === 'tasks' ? (
          <TaskList userId={user.uid} onStatsUpdate={setStats} />
        ) : (
          <Profile userId={user.uid} onStatsUpdate={setStats} />
        )}
      </div>
    </div>
  );
}
