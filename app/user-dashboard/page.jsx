'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import Navbar from '../../components/Navbar';
import TaskList from '../../components/user/TaskList';
import Profile from '../../components/user/Profile';

function DashboardContent() {
  const { user, userRole, loading } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState('tasks');
  const [stats, setStats] = useState(null);

  const isStaff = userRole === 'admin' || userRole === 'manager';

  // Handle Tabs & Role Restrictions
  useEffect(() => {
    if (isStaff) {
      // If Admin/Manager, FORCE 'profile' tab
      setActiveTab('profile');
    } else {
      // If standard User, allow switching via URL or default
      const tabParam = searchParams.get('tab');
      if (tabParam) setActiveTab(tabParam);
    }
  }, [searchParams, isStaff]);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {isStaff
              ? t('userDashboard.title')
              : `${t('userDashboard.welcome')}, ${
                  user.displayName || t('userDashboard.explorer')
                }`}
          </h1>
          <p className="text-gray-600">
            {isStaff
              ? t('userDashboard.subtitle')
              : t('userDashboard.trackProgress')}
          </p>
        </div>

        {/* Stats Row (HIDDEN for Staff) */}
        {!isStaff && activeTab === 'tasks' && stats && (
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

        {/* Tab Switcher (HIDDEN for Staff) */}
        {!isStaff && (
          <div className="bg-white p-1 rounded-xl inline-flex border border-gray-200 shadow-sm mb-6">
            <button
              onClick={() => {
                setActiveTab('tasks');
                window.history.pushState(null, '', '?tab=tasks');
              }}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'tasks'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Quests Board
            </button>
            <button
              onClick={() => {
                setActiveTab('profile');
                window.history.pushState(null, '', '?tab=profile');
              }}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'profile'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Profile
            </button>
          </div>
        )}

        {/* Main Content Area */}
        {activeTab === 'tasks' && !isStaff ? (
          <TaskList userId={user.uid} onStatsUpdate={setStats} />
        ) : (
          <Profile userId={user.uid} onStatsUpdate={setStats} />
        )}
      </div>
    </div>
  );
}

export default function UserDashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
