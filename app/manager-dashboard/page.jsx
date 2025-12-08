'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getManagerTasks, getAllTasks } from '@/app/actions';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';

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
      <div className="min-h-screen bg-[#faf8eb] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#171717]"></div>
      </div>
    );
  }

  if (!user || userRole !== 'manager') return null;

  return (
    <div className="min-h-screen bg-[#faf8eb] font-sans text-[#171717]">
      <Navbar />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-[#171717]">Manager Dashboard</h1>
          <p className="mt-2 text-sm text-gray-500">
            Oversee your assigned tasks and monitor overall progress.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Column 1: My Assigned Tasks */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-[#171717] mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              My Managed Tasks
            </h2>
            {myTasks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No tasks assigned to you yet.</p>
            ) : (
              <div className="space-y-4">
                {myTasks.map((task) => (
                  <Link
                    href={`/manager-dashboard/task/${task.task_id}`}
                    key={task.task_id}
                    className="block border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all group bg-white"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-[#171717] group-hover:text-blue-600 transition-colors">
                        {task.title}
                      </h3>
                      <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                        Manage
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {task.description}
                    </p>
                    <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-100 pt-3">
                      <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
                      <span className={`px-2 py-0.5 rounded-full ${task.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {task.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: All Available Tasks */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-[#171717] mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              All Tasks Overview
            </h2>
            {allTasks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No other tasks available.</p>
            ) : (
              <div className="space-y-4">
                {allTasks.map((task) => (
                  <div
                    key={task.task_id}
                    className="border border-gray-200 rounded-xl p-5 hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="font-bold text-lg text-[#171717] mb-1">
                      {task.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {task.description}
                    </p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span className="font-medium bg-gray-100 px-2 py-1 rounded">
                        Manager: {task.manager?.email || 'Unassigned'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${task.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
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