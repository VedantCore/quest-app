'use client';
import { useParams } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import Profile from '../../../components/user/Profile';
import TaskList from '../../../components/user/TaskList';
import { useLocale } from '../../../context/LocaleContext';

export default function UserPage() {
  const params = useParams();
  const { userId } = params;
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t('user.profile.accountInfo')}
            </h2>
            <div className="bg-white shadow rounded-lg p-6">
              <Profile userId={userId} />
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t('userDashboard.tabs.tasks')}
            </h2>
            <div className="bg-white shadow rounded-lg p-6">
              <TaskList userId={userId} mode="enrolled" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
