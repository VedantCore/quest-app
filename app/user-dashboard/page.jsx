'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import TaskList from '../../components/user/TaskList';
import Profile from '../../components/user/Profile';

export default function UserDashboard() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('tasks');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!loading && (!user || userRole === 'admin' || userRole === 'manager')) {
      router.push('/');
    }
  }, [user, userRole, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700 font-medium">
            Loading your dashboard...
          </div>
        </div>
      </div>
    );
  }

  if (!user || userRole === 'admin' || userRole === 'manager') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-12 border border-gray-200">
          <div className="text-6xl mb-4">🚫</div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </div>
          <p className="text-gray-600">This area is for regular users only.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'tasks', label: 'My Tasks', icon: '📋' },
    { id: 'profile', label: 'Profile & Points', icon: '👤' },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Quick Stats */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Welcome Back! 👋
              </h1>
              <p className="text-lg text-gray-600">
                Track your progress and manage your tasks
              </p>
            </div>
          </div>

          {/* Quick Stats Bar */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Active Tasks
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.activeTasks}
                    </p>
                  </div>
                  <div className="text-3xl">📋</div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Completed
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.completedTasks}
                    </p>
                  </div>
                  <div className="text-3xl">✅</div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Total Points
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.totalPoints}
                    </p>
                  </div>
                  <div className="text-3xl">🎯</div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      Progress
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.overallProgress || 0}%
                    </p>
                  </div>
                  <div className="text-3xl">📈</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 py-4 px-6 font-semibold text-base transition-all duration-200
                  relative overflow-hidden
                  ${
                    activeTab === tab.id
                      ? 'text-black bg-gray-100'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black"></div>
                )}
                <span className="text-2xl mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'tasks' && (
            <TaskList userId={user.uid} onStatsUpdate={setStats} />
          )}
          {activeTab === 'profile' && (
            <Profile userId={user.uid} onStatsUpdate={setStats} />
          )}
        </div>
      </div>
    </div>
  );
}
