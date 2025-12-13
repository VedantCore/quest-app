'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ManagerList() {
  const router = useRouter();
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedManager, setSelectedManager] = useState(null);
  const [managerTasks, setManagerTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'manager')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setManagers(data || []);
    } catch (error) {
      console.error('Error fetching managers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTasks = async (manager) => {
    setSelectedManager(manager);
    setLoadingTasks(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_manager_id', manager.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setManagerTasks(data || []);
    } catch (error) {
      console.error('Error fetching manager tasks:', error);
      alert('Failed to fetch tasks');
    } finally {
      setLoadingTasks(false);
    }
  };

  const closeTaskModal = () => {
    setSelectedManager(null);
    setManagerTasks([]);
  };

  const filteredManagers = managers.filter((manager) => {
    return (
      manager.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manager.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (loading)
    return (
      <div className="text-center py-12 text-gray-500">Loading managers...</div>
    );

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
        <input
          type="text"
          placeholder="Search managers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Manager
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredManagers.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No managers found.
                  </td>
                </tr>
              ) : (
                filteredManagers.map((manager) => (
                  <tr
                    key={manager.user_id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                      <div className="flex items-center gap-3">
                        {manager.avatar_url ? (
                          <img
                            src={manager.avatar_url}
                            alt={manager.name}
                            className="h-9 w-9 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-medium">
                            {manager.name?.charAt(0).toUpperCase() || 'M'}
                          </div>
                        )}
                        <div className="text-sm font-medium text-gray-900">
                          {manager.name || 'No name'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {manager.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {manager.created_at
                        ? new Date(manager.created_at).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleViewTasks(manager)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                      >
                        View Tasks
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tasks Modal */}
      {selectedManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Assigned Tasks
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Manager: {selectedManager.name}
                </p>
              </div>
              <button
                onClick={closeTaskModal}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              {loadingTasks ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
                  <p>Loading tasks...</p>
                </div>
              ) : managerTasks.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <svg
                    className="w-12 h-12 text-gray-300 mx-auto mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  <p className="text-gray-500 font-medium">
                    No tasks assigned to this manager yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {managerTasks.map((task) => (
                    <div
                      key={task.task_id}
                      onClick={() =>
                        window.open(`/tasks/${task.task_id}`, '_blank')
                      }
                      className="group bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-600 hover:shadow-md transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {task.title}
                        </h4>
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            task.is_active
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}
                        >
                          {task.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-700">
                            Level:
                          </span>
                          <span className="text-indigo-600">
                            {'★'.repeat(task.level) +
                              '☆'.repeat(5 - task.level)}
                          </span>
                        </div>
                        <div className="w-px h-3 bg-gray-300"></div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-700">
                            Deadline:
                          </span>
                          <span>
                            {task.deadline
                              ? new Date(task.deadline).toLocaleDateString()
                              : 'No deadline'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
