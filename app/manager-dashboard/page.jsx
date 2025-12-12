'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getManagerTasks, getAllTasks } from '@/app/actions';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import ManagerTaskDetailsModal from '@/components/manager/ManagerTaskDetailsModal';

export default function ManagerDashboard() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();

  const [myTasks, setMyTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // State for Tabs
  const [activeTab, setActiveTab] = useState('my-tasks');
  
  // State for the "All Tasks" modal
  const [selectedTask, setSelectedTask] = useState(null);

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
        setAllTasks(allTasksRes.data || []);
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

  const getDeadline = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading || isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#13B5A0]"></div>
      </div>
    );
  }

  if (!user || userRole !== 'manager') return null;

  return (
    <div className="min-h-screen font-sans text-[#13B5A0] bg-[#faf8eb]">
      <Navbar />

      <ManagerTaskDetailsModal 
        task={selectedTask} 
        isOpen={!!selectedTask} 
        onClose={() => setSelectedTask(null)} 
      />

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 pt-8 pb-0">
          <h1 className="text-3xl font-bold text-[#13B5A0] mb-2">
            Manager Dashboard
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            Welcome back, {user.displayName || user.email}.
          </p>

          {/* Tab Navigation */}
          <div className="flex space-x-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('my-tasks')}
              className={`pb-4 px-1 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'my-tasks'
                  ? 'border-[#13B5A0] text-[#13B5A0]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              My Assigned Tasks
            </button>
            <button
              onClick={() => setActiveTab('all-tasks')}
              className={`pb-4 px-1 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'all-tasks'
                  ? 'border-[#13B5A0] text-[#13B5A0]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              All Tasks Repository
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Section 1: My Assigned Tasks */}
        {activeTab === 'my-tasks' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {myTasks.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                <div className="mx-auto h-12 w-12 text-gray-300 mb-4">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">No quests assigned to you yet.</p>
                <p className="text-sm text-gray-400 mt-1">Contact an admin to get assigned.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myTasks.map((task) => (
                  <Link
                    href={`/manager-dashboard/task/${task.task_id}`}
                    key={task.task_id}
                    className="block bg-white rounded-xl border border-gray-200 p-6 hover:border-[#13B5A0] hover:shadow-lg transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#13B5A0] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg text-gray-900 group-hover:text-[#13B5A0] transition-colors line-clamp-1">
                        {task.title}
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-green-50 text-[#13B5A0] px-2 py-1 rounded border border-green-100 shrink-0 ml-2">
                        Manage
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-2 mb-5 min-h-[40px]">
                      {task.description || "No description provided."}
                    </p>
                    
                    <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-50 pt-4">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Due: {getDeadline(task.created_at)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                          task.is_active ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                        }`}>
                        {task.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section 2: All Tasks Overview */}
        {activeTab === 'all-tasks' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quest</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Manager</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deadline</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allTasks.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                          No tasks found in the system.
                        </td>
                      </tr>
                    ) : (
                      allTasks.map((task) => (
                        <tr 
                          key={task.task_id} 
                          onClick={() => setSelectedTask(task)}
                          className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                        >
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 group-hover:text-[#13B5A0] transition-colors">{task.title}</div>
                            <div className="text-xs text-gray-500 line-clamp-1 max-w-md mt-0.5">{task.description}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {task.manager ? (
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                  {task.manager.name ? task.manager.name[0].toUpperCase() : task.manager.email[0].toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-gray-700">{task.manager.name || 'Manager'}</span>
                                  <span className="text-[10px] text-gray-400">{task.manager.email}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-1 rounded border border-gray-200">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                                task.is_active
                                  ? 'bg-blue-50 text-blue-700 border-blue-100'
                                  : 'bg-red-50 text-red-700 border-red-100'
                              }`}
                            >
                              {task.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {getDeadline(task.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button 
                              className="text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg group-hover:bg-white group-hover:text-[#13B5A0] group-hover:border-[#13B5A0] transition-all"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}