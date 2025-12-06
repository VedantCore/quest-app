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

  useEffect(() => {
    if (!loading && (!user || userRole === 'admin' || userRole === 'manager')) {
      router.push('/');
    }
  }, [user, userRole, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || userRole === 'admin' || userRole === 'manager') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">Access Denied</div>
      </div>
    );
  }

  const tabs = [
    { id: 'tasks', label: 'My Tasks', icon: '📋' },
    { id: 'profile', label: 'Profile & Points', icon: '👤' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <p className="mt-2 text-gray-600">
            View your assigned tasks and track your progress
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'tasks' && <TaskList userId={user.uid} />}
          {activeTab === 'profile' && <Profile userId={user.uid} />}
        </div>
      </div>
    </div>
  );
}
