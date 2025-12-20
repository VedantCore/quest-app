'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { createTask, updateTask, deleteTask } from '@/app/actions';
import { getCompaniesAction } from '@/app/company-actions';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function TaskManagement() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [managers, setManagers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedManagerId: '',
    companyId: '',
    deadline: '',
    level: 1,
  });
  const [steps, setSteps] = useState([
    { title: '', description: '', points_reward: 0 },
  ]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksResult, managersResult, companiesResult] = await Promise.all([
        supabase
          .from('tasks')
          .select(
            `
          *,
          task_steps (*),
          companies (company_id, name),
          task_enrollments (
            user_id,
            joined_at,
            users (
              name,
              email,
              avatar_url
            )
          )
        `
          )
          .order('created_at', { ascending: false }),
        supabase.from('users').select('user_id, name').eq('role', 'manager'),
        user ? getCompaniesAction(await user.getIdToken()) : { success: false },
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (managersResult.error) throw managersResult.error;

      setTasks(tasksResult.data || []);
      setManagers(managersResult.data || []);
      if (companiesResult.success) {
        setCompanies(companiesResult.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (isEditing) {
        const result = await updateTask(editingTaskId, formData, steps);

        if (result.success) {
          toast.success('Quest updated successfully!');
          closeCreateModal();
          fetchData();
          if (selectedTask && selectedTask.task_id === editingTaskId) {
            // Refresh selected task details if it's open
            // We might need to re-fetch the specific task or just close it
            setSelectedTask(null);
          }
        } else {
          toast.error(result.message);
        }
      } else {
        const taskPayload = { ...formData, createdBy: user.uid };
        const result = await createTask(taskPayload, steps);

        if (result.success) {
          toast.success('Quest created successfully!');
          closeCreateModal();
          fetchData();
        } else {
          toast.error(result.message);
        }
      }
    } catch (error) {
      toast.error('Error saving quest: ' + error.message);
    }
  };

  const addStep = () => {
    setSteps([...steps, { title: '', description: '', points_reward: 0 }]);
  };

  const removeStep = (index) => {
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(
      newSteps.length > 0
        ? newSteps
        : [{ title: '', description: '', points_reward: 0 }]
    );
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setIsEditing(false);
    setEditingTaskId(null);
    setFormData({
      title: '',
      description: '',
      assignedManagerId: '',
      companyId: '',
      deadline: '',
      level: 1,
    });
    setSteps([{ title: '', description: '', points_reward: 0 }]);
  };

  const handleEditClick = (task) => {
    setFormData({
      title: task.title,
      description: task.description,
      assignedManagerId: task.assigned_manager_id || '',
      companyId: task.company_id || '',
      deadline: task.deadline || '',
      level: task.level || 1,
    });

    setSteps(
      task.task_steps && task.task_steps.length > 0
        ? task.task_steps.map((s) => ({
            step_id: s.step_id,
            title: s.title,
            description: s.description,
            points_reward: s.points_reward,
          }))
        : [{ title: '', description: '', points_reward: 0 }]
    );

    setIsEditing(true);
    setEditingTaskId(task.task_id);
    setShowCreateModal(true);
    setSelectedTask(null);
  };

  const handleDeleteClick = (taskId) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3 min-w-[200px]">
          <p className="font-medium text-gray-800 text-sm">
            Are you sure you want to delete this quest?
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                performDelete(taskId);
              }}
              className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      ),
      {
        duration: 5000,
        position: 'top-center',
        style: {
          background: '#fff',
          color: '#333',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          borderRadius: '12px',
          padding: '16px',
        },
      }
    );
  };

  const performDelete = async (taskId) => {
    try {
      const result = await deleteTask(taskId);
      if (result.success) {
        toast.success('Quest deleted successfully');
        fetchData();
        if (selectedTask && selectedTask.task_id === taskId) {
          setSelectedTask(null);
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error deleting quest: ' + error.message);
    }
  };

  const getManagerName = (id) =>
    managers.find((m) => m.user_id === id)?.name || 'Unassigned';

  const getDeadline = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderStars = (level) => {
    return (
      <div className="flex gap-0.5" title={`Difficulty ${level || 1}`}>
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-4 h-4 ${
              i < (level || 1)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">Loading quests...</div>
    );
  }

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = tasks.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(tasks.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Quests</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition shadow-sm font-medium text-sm"
        >
          + Create Quest
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Quest Title
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Difficulty
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Manager
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Deadline
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Conditions
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Points
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {tasks.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No quests found. Create your first quest!
                  </td>
                </tr>
              ) : (
                currentItems.map((task) => {
                  const totalPoints =
                    task.task_steps?.reduce(
                      (sum, step) => sum + (step.points_reward || 0),
                      0
                    ) || 0;

                  return (
                    <tr
                      key={task.task_id}
                      onClick={() => setSelectedTask(task)}
                      className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 min-w-[200px]">
                        <div>
                          <div className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                            {task.title}
                          </div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {task.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {renderStars(task.level)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {getManagerName(task.assigned_manager_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {getDeadline(task.deadline)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {task.task_steps?.length || 0} conditions
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                        {totalPoints} pts
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            task.is_active
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-red-50 text-red-700 border border-red-100'
                          }`}
                        >
                          {task.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(task);
                          }}
                          className="text-gray-400 hover:text-indigo-600 transition-colors p-2 hover:bg-gray-50 rounded-lg"
                          title="Edit Quest"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(task.task_id);
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg ml-1"
                          title="Delete Quest"
                        >
                          <svg
                            className="w-5 h-5"
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {tasks.length > itemsPerPage && (
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

      {selectedTask && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-gray-100 max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-start bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {selectedTask.title}
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Difficulty:
                    </span>
                    {renderStars(selectedTask.level)}
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      selectedTask.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {selectedTask.is_active ? '● Active' : '● Inactive'}
                  </span>
                  <span className="text-sm text-gray-500">
                    Manager:{' '}
                    <span className="font-medium text-gray-900">
                      {getManagerName(selectedTask.assigned_manager_id)}
                    </span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <svg
                  className="w-5 h-5"
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

            <div className="overflow-y-auto p-8 bg-white/30 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-3">
                      Quest Details
                    </h4>
                    <p className="text-gray-600 leading-relaxed text-sm bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      {selectedTask.description}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-4">
                      Completion Conditions
                    </h4>
                    <div className="space-y-3">
                      {selectedTask.task_steps?.length > 0 ? (
                        selectedTask.task_steps.map((step, idx) => (
                          <div
                            key={step.step_id}
                            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-gray-300 transition-colors"
                          >
                            <div className="flex items-start gap-4">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white mt-0.5">
                                {idx + 1}
                              </span>
                              <div>
                                <p className="font-semibold text-gray-900 text-sm">
                                  {step.title}
                                </p>
                                {step.description && (
                                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                    {step.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-center ml-10 sm:ml-0">
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Reward
                              </span>
                              <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 min-w-[70px] text-center">
                                {step.points_reward} pts
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-500 bg-white p-6 rounded-xl border border-gray-200 italic text-center">
                          No specific completion conditions defined for this
                          quest.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <span className="font-bold text-gray-900">Deadline</span>
                    </div>
                    <p className="text-gray-600 text-sm font-medium pl-1">
                      {getDeadline(selectedTask.deadline)}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <svg
                        className="w-5 h-5 text-orange-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                        />
                      </svg>
                      <span className="font-bold text-gray-900 text-sm">
                        Total Achievement
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-indigo-600">
                        {selectedTask.task_steps?.reduce(
                          (s, st) => s + (st.points_reward || 0),
                          0
                        )}
                      </span>
                      <span className="text-sm font-bold text-gray-500">
                        Points
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                      Awarded upon successful completion of all conditions.
                    </p>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col max-h-[300px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">
                          Participants
                        </span>
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">
                          {selectedTask.task_enrollments?.length || 0}
                        </span>
                      </div>
                    </div>

                    <div className="overflow-y-auto pr-1 space-y-3 flex-1 scrollbar-thin scrollbar-thumb-gray-200">
                      {!selectedTask.task_enrollments ||
                      selectedTask.task_enrollments.length === 0 ? (
                        <p className="text-xs text-gray-400 italic text-center py-4">
                          No users enrolled yet.
                        </p>
                      ) : (
                        selectedTask.task_enrollments.map((enrollment) => (
                          <div
                            key={enrollment.user_id}
                            className="flex items-center gap-3"
                          >
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 border border-indigo-200">
                              {enrollment.users?.avatar_url ? (
                                <img
                                  src={enrollment.users.avatar_url}
                                  alt=""
                                  className="h-full w-full rounded-full object-cover"
                                />
                              ) : (
                                (
                                  enrollment.users?.name ||
                                  enrollment.users?.email ||
                                  'U'
                                )
                                  .charAt(0)
                                  .toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-900 truncate">
                                {enrollment.users?.name || 'Unknown User'}
                              </p>
                              <p className="text-[10px] text-gray-500 truncate">
                                Joined{' '}
                                {new Date(
                                  enrollment.joined_at
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
              >
                Close
              </button>
              <button
                onClick={() => handleEditClick(selectedTask)}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                Edit Quest
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {isEditing ? 'Edit Quest' : 'Create New Quest'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quest Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all"
                  placeholder="E.g., Complete Project X"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quest Details
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all"
                  rows="3"
                  placeholder="Describe the quest objectives..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.deadline}
                    onChange={(e) =>
                      setFormData({ ...formData, deadline: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    required
                    value={formData.level}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        level: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all"
                  >
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl} {'★'.repeat(lvl) + '☆'.repeat(5 - lvl)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company *
                  </label>
                  <select
                    required
                    value={formData.companyId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        companyId: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all"
                  >
                    <option value="">Select a company</option>
                    {companies.map((company) => (
                      <option
                        key={company.company_id}
                        value={company.company_id}
                      >
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign Manager
                  </label>
                  <select
                    required
                    value={formData.assignedManagerId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assignedManagerId: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all"
                  >
                    <option value="">Select a manager</option>
                    {managers.map((manager) => (
                      <option key={manager.user_id} value={manager.user_id}>
                        {manager.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-bold text-gray-900">
                    Completion Conditions
                  </label>
                  <button
                    type="button"
                    onClick={addStep}
                    className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 font-semibold transition-colors"
                  >
                    + Add Condition
                  </button>
                </div>
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <div
                      key={index}
                      className="flex flex-col gap-3 p-4 bg-gray-50/50 rounded-xl border border-gray-100"
                    >
                      <div className="flex gap-3">
                        <input
                          type="text"
                          required
                          value={step.title}
                          onChange={(e) =>
                            updateStep(index, 'title', e.target.value)
                          }
                          className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-gray-400 outline-none"
                          placeholder={`Condition ${index + 1}`}
                        />
                        <input
                          type="number"
                          required
                          min="0"
                          value={step.points_reward}
                          onChange={(e) =>
                            updateStep(index, 'points_reward', e.target.value)
                          }
                          className="w-24 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-gray-400 outline-none"
                          placeholder="Pts"
                        />
                        {steps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStep(index)}
                            className="text-red-500 hover:text-red-700 px-2"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={step.description}
                        onChange={(e) =>
                          updateStep(index, 'description', e.target.value)
                        }
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-gray-400 outline-none"
                        placeholder="Description (optional)"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition font-semibold shadow-sm"
                >
                  {isEditing ? 'Update Quest' : 'Create Quest'}
                </button>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-50 transition font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
