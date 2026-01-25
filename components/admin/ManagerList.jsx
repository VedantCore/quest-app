'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { removeUserFromCompanyAction } from '@/app/company-actions';
import toast from 'react-hot-toast';

export default function ManagerList({ companyId }) {
  const { user: currentUser } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedManager, setSelectedManager] = useState(null);
  const [managerTasks, setManagerTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      let data, error;

      // Debug: Check auth state
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      console.log('[ManagerList] Current auth user:', authUser);
      console.log('[ManagerList] Fetching managers, companyId:', companyId);

      if (companyId) {
        // Fetch managers for this company via join
        const result = await supabase
          .from('user_companies')
          .select(
            `
            user_id,
            users!user_companies_user_id_fkey (
              user_id,
              name,
              email,
              role,
              avatar_url,
              created_at,
              total_points
            )
          `,
          )
          .eq('company_id', companyId);

        console.log('[ManagerList] Company query result:', result);

        if (result.error) throw result.error;
        // Flatten and filter for managers only
        data = result.data
          .map((item) => item.users)
          .filter((u) => u && u.role === 'manager');

        console.log('[ManagerList] Filtered managers:', data);
      } else {
        const result = await supabase
          .from('users')
          .select('*')
          .eq('role', 'manager')
          .order('created_at', { ascending: false });

        console.log('[ManagerList] Global query result:', result);
        data = result.data;
        error = result.error;
      }

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
      alert(t('managerList.fetchTasksFailed'));
    } finally {
      setLoadingTasks(false);
    }
  };

  const closeTaskModal = () => {
    setSelectedManager(null);
    setManagerTasks([]);
  };

  const handleRemoveManager = async (managerId) => {
    if (
      !confirm('Are you sure you want to remove this manager from the company?')
    )
      return;

    try {
      const token = await currentUser.getIdToken();
      const result = await removeUserFromCompanyAction(
        token,
        managerId,
        companyId,
      );

      if (result.success) {
        toast.success('Manager removed successfully');
        setManagers(managers.filter((m) => m.user_id !== managerId));
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error removing manager:', error);
      toast.error('Failed to remove manager');
    }
  };

  const filteredManagers = managers.filter((manager) => {
    return (
      manager.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manager.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredManagers.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredManagers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading)
    return (
      <div className="text-center py-12 text-gray-500">
        {t('managerList.loading')}
      </div>
    );

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
        <input
          type="text"
          placeholder={t('managerList.searchPlaceholder')}
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
                  {t('managerList.manager')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('managerList.email')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('managerList.joined')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('managerList.actions')}
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
                    {t('managerList.noManagers')}
                  </td>
                </tr>
              ) : (
                currentItems.map((manager) => (
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
                          {manager.name || t('taskManagement.unassigned')}
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
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleViewTasks(manager)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                        >
                          {t('managerList.viewTasks')}
                        </button>
                        {companyId && (
                          <button
                            onClick={() => handleRemoveManager(manager.user_id)}
                            className="text-red-600 hover:text-red-800 font-medium transition-colors"
                            title={t('common.title.removeFromCompany')}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {filteredManagers.length > itemsPerPage && (
        <div className="flex justify-center mt-6">
          <nav
            className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
            aria-label="Pagination"
          >
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                currentPage === 1
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="sr-only">Previous</span>
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => paginate(i + 1)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                  currentPage === i + 1
                    ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                currentPage === totalPages
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="sr-only">Next</span>
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </nav>
        </div>
      )}

      {/* Tasks Modal */}
      {selectedManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {t('managerList.assignedTasks')}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {t('managerList.managerLabel')}: {selectedManager.name}
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
                  <p>{t('managerList.loadingTasks')}</p>
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
                    {t('managerList.noTasks')}
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
                          {task.is_active
                            ? t('taskManagement.active')
                            : t('taskManagement.inactive')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-700">
                            {t('taskManagement.level')}:
                          </span>
                          <span className="text-indigo-600">
                            {'★'.repeat(task.level) +
                              '☆'.repeat(5 - task.level)}
                          </span>
                        </div>
                        <div className="w-px h-3 bg-gray-300"></div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-700">
                            {t('taskManagement.deadline')}:
                          </span>
                          <span>
                            {task.deadline
                              ? new Date(task.deadline).toLocaleDateString()
                              : t('managerList.noDeadline')}
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
