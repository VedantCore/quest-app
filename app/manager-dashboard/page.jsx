'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import TaskAssignment from '@/components/manager/TaskAssignment';

export default function ManagerDashboard() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('assignments');

  useEffect(() => {
    if (!loading && (!user || userRole !== 'manager')) {
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

  if (!user || userRole !== 'manager') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">Access Denied - Manager Only</div>
      </div>
    );
  }

  const tabs = [
    { id: 'assignments', label: 'Task Assignments', icon: '📋' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Manager Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {user.email}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeTab === tab.id
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-400'
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
        <div className="mt-8 pb-12">
          {activeTab === 'assignments' && <TaskAssignment />}
          {activeTab === 'analytics' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-4">Analytics</h2>
              <p className="text-gray-600">Analytics panel coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
