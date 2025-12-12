'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function UserList() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTasks, setUserTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'user')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTasks = async (user) => {
    setSelectedUser(user);
    setLoadingTasks(true);
    try {
      // Fetch tasks the user is enrolled in
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('task_enrollments')
        .select(
          `
          joined_at,
          tasks (
            *,
            task_steps (points_reward),
            manager:users!assigned_manager_id (name)
          )
        `
        )
        .eq('user_id', user.user_id)
        .order('joined_at', { ascending: false });

      if (enrollmentsError) throw enrollmentsError;

      // Fetch points earned by the user for each task
      const { data: pointsData, error: pointsError } = await supabase
        .from('user_point_history')
        .select(
          `
          points_earned,
          task_steps (
            task_id
          )
        `
        )
        .eq('user_id', user.user_id);

      if (pointsError) throw pointsError;

      // Calculate points per task
      const pointsMap = {};
      if (pointsData) {
        pointsData.forEach((record) => {
          const taskId = record.task_steps?.task_id;
          if (taskId) {
            pointsMap[taskId] =
              (pointsMap[taskId] || 0) + (record.points_earned || 0);
          }
        });
      }

      // Flatten the structure and add points
      const tasks = enrollments.map((enrollment) => {
        const totalPoints =
          enrollment.tasks.task_steps?.reduce(
            (sum, step) => sum + (step.points_reward || 0),
            0
          ) || 0;

        return {
          ...enrollment.tasks,
          joined_at: enrollment.joined_at,
          earned_points: pointsMap[enrollment.tasks.task_id] || 0,
          total_points: totalPoints,
        };
      });

      setUserTasks(tasks || []);
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      alert('Failed to fetch tasks');
    } finally {
      setLoadingTasks(false);
    }
  };

  const closeTaskModal = () => {
    setSelectedUser(null);
    setUserTasks([]);
  };

  const filteredUsers = users.filter((user) => {
    return (
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Handle null/undefined values
    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    // Special handling for numbers (points)
    if (sortConfig.key === 'total_points') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const renderSortableHeader = (label, key) => {
    const isActive = sortConfig.key === key;
    const direction = sortConfig.direction;

    return (
      <div
        className="flex items-center gap-1 cursor-pointer group"
        onClick={() => handleSort(key)}
      >
        <span>{label}</span>
        <div className="flex flex-col">
          <svg
            className={`w-2.5 h-2.5 ${
              isActive && direction === 'asc'
                ? 'text-[#13B5A0]'
                : 'text-gray-300 group-hover:text-gray-400'
            }`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M7 14l5-5 5 5H7z" />
          </svg>
          <svg
            className={`w-2.5 h-2.5 -mt-0.5 ${
              isActive && direction === 'desc'
                ? 'text-[#13B5A0]'
                : 'text-gray-300 group-hover:text-gray-400'
            }`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M7 10l5 5 5-5H7z" />
          </svg>
        </div>
      </div>
    );
  };

  if (loading)
    return (
      <div className="text-center py-12 text-gray-500">Loading users...</div>
    );

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
        <input
          type="text"
          placeholder="Search users..."
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
                  {renderSortableHeader('User', 'name')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {renderSortableHeader('Email', 'email')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {renderSortableHeader('Points', 'total_points')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {renderSortableHeader('Joined', 'created_at')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {sortedUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user) => (
                  <tr
                    key={user.user_id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-[#13B5A0] flex items-center justify-center text-white text-sm font-medium">
                          {user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="text-sm font-medium text-[#13B5A0]">
                          {user.name || 'No name'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#13B5A0]">
                      {user.total_points || 0} pts
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleViewTasks(user)}
                        className="text-[#13B5A0] hover:text-[#0f9080] font-medium transition-colors"
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
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Participating Tasks
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  User: {selectedUser.name}
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#13B5A0] mb-3"></div>
                  <p>Loading tasks...</p>
                </div>
              ) : userTasks.length === 0 ? (
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
                    This user hasn't joined any tasks yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userTasks.map((task) => (
                    <div
                      key={task.task_id}
                      onClick={() =>
                        window.open(`/tasks/${task.task_id}`, '_blank')
                      }
                      className="group bg-white border border-gray-200 rounded-xl p-4 hover:border-[#13B5A0] hover:shadow-md transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-gray-900 group-hover:text-[#13B5A0] transition-colors">
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
                          <span className="text-[#13B5A0]">
                            {'★'.repeat(task.level) +
                              '☆'.repeat(5 - task.level)}
                          </span>
                        </div>
                        <div className="w-px h-3 bg-gray-300"></div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-700">
                            Joined:
                          </span>
                          <span>
                            {task.joined_at
                              ? new Date(task.joined_at).toLocaleDateString()
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="w-px h-3 bg-gray-300"></div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-700">
                            Points:
                          </span>
                          <span className="text-[#13B5A0] font-bold">
                            {task.earned_points} / {task.total_points}
                          </span>
                        </div>
                        <div className="w-px h-3 bg-gray-300"></div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-700">
                            Manager:
                          </span>
                          <span className="text-gray-900">
                            {task.manager?.name || 'Unassigned'}
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
