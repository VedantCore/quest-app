'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getManagerTasks, getAllTasks } from '@/app/actions';
import toast from 'react-hot-toast';

export default function ManagerDashboard() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();

  const [myTasks, setMyTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && (!user || userRole !== 'manager')) {
      router.push('/');
    } else if (user && userRole === 'manager') {
      fetchData();
    }
  }, [user, userRole, loading, router]);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const [myTasksRes, allTasksRes] = await Promise.all([
        getManagerTasks(user.uid),
        getAllTasks(),
      ]);

      if (myTasksRes.success) setMyTasks(myTasksRes.data || []);
      else toast.error('Failed to load my tasks');

      if (allTasksRes.success) {
        const otherTasks = (allTasksRes.data || []).filter(
          (t) => t.assigned_manager_id !== user.uid
        );
        setAllTasks(otherTasks);
      } else {
        toast.error('Failed to load all tasks');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error loading dashboard data');
    } finally {
      setIsLoadingData(false);
    }
  };

  if (loading || isLoadingData) {
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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-[#13B5A0]">
            Manager Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {user.email}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Column 1: My Assigned Tasks */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-[#13B5A0] mb-4 flex items-center">
              <span className="mr-2">📋</span> My Managed Tasks
            </h2>
            {myTasks.length === 0 ? (
              <p className="text-gray-500">No tasks assigned to you yet.</p>
            ) : (
              <div className="space-y-4">
                {myTasks.map((task) => (
                  <Link
                    href={`/manager-dashboard/task/${task.task_id}`}
                    key={task.task_id}
                    className="block border rounded-lg p-4 hover:bg-teal-50 transition cursor-pointer group"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-lg text-[#13B5A0] group-hover:text-[#0f8e7e]">
                        {task.title}
                      </h3>
                      <span className="text-xs text-[#13B5A0] bg-teal-50 px-2 py-1 rounded-full border border-[#13B5A0]">
                        View Participants →
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {task.description}
                    </p>
                    <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
                      <span>
                        Created:{' '}
                        {new Date(task.created_at).toLocaleDateString()}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full ${
                          task.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {task.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: All Available Tasks */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-[#13B5A0] mb-4 flex items-center">
              <span className="mr-2">🌍</span> All Available Tasks
            </h2>
            {allTasks.length === 0 ? (
              <p className="text-gray-500">No tasks available in the system.</p>
            ) : (
              <div className="space-y-4">
                {allTasks.map((task) => (
                  <div
                    key={task.task_id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition"
                  >
                    <h3 className="font-semibold text-lg text-[#13B5A0]">
                      {task.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {task.description}
                    </p>
                    <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
                      <span>
                        Manager: {task.manager?.email || 'Unassigned'}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full ${
                          task.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {task.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
