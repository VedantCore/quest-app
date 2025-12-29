'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import Navbar from '@/components/Navbar';
import TaskList from '@/components/user/TaskList';

export default function TasksPage() {
  const { user, userRole, loading } = useAuth();
  const { t } = useLocale();
  const router = useRouter();

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
            {t('tasks.loading')}
          </div>
        </div>
      </div>
    );
  }

  if (!user || userRole === 'admin' || userRole === 'manager') {
    return null; // Redirect handled in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('tasks.title')}
          </h1>
          <p className="text-lg text-gray-600">{t('tasks.subtitle')}</p>
        </div>

        <TaskList userId={user.uid} mode="available" />
      </div>
    </div>
  );
}
