'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { createTask } from '@/app/actions';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function TaskManagement() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedManagerId: '',
    deadline: '',
  });
  const [steps, setSteps] = useState([
    { title: '', description: '', points_reward: 0 },
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(
          `
          *,
          task_steps (*),
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
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      const { data: managersData, error: managersError } = await supabase
        .from('users')
        .select('user_id, name')
        .eq('role', 'manager');

      if (managersError) throw managersError;

      setTasks(tasksData || []);
      setManagers(managersData || []);
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
      const taskPayload = { ...formData, createdBy: user.uid };
      const result = await createTask(taskPayload, steps);

      if (result.success) {
        toast.success('Quest created successfully!');
        closeCreateModal();
        fetchData();
      } else {
        toast.error(result.message);
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
    setFormData({
      title: '',
      description: '',
      assignedManagerId: '',
      deadline: '',
    });
    setSteps([{ title: '', description: '', points_reward: 0 }]);
  };

  const getManagerName = (id) =>
    managers.find((m) => m.user_id === id)?.name || 'Unassigned';

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

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">Loading quests...</div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#13B5A0]">Quests</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#13B5A0] text-white px-5 py-2.5 rounded-xl hover:bg-[#13B5A0] transition shadow-sm font-medium text-sm"
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
                  Manager
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {tasks.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No quests found. Create your first quest!
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
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
                          <div className="text-sm font-semibold text-[#13B5A0] group-hover:text-[#13B5A0] transition-colors">
                            {task.title}
                          </div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {task.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {getManagerName(task.assigned_manager_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {task.task_steps?.length || 0} conditions
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#13B5A0]">
                        {totalPoints} pts
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            task.is_active
                              ? 'bg-green-50 text-[#13B5A0] border border-green-100'
                              : 'bg-red-50 text-red-700 border border-red-100'
                          }`}
                        >
                          {task.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTask && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-gray-100 max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-start bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-2xl font-bold text-[#13B5A0]">
                  {selectedTask.title}
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      selectedTask.is_active
                        ? 'bg-green-100 text-[#13B5A0]'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {selectedTask.is_active ? '● Active' : '● Inactive'}
                  </span>
                  <span className="text-sm text-gray-500">
                    Manager:{' '}
                    <span className="font-medium text-[#13B5A0]">
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

            <div className="overflow-y-auto p-8 bg-[#faf8eb]/30 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                  <div>
                    <h4 className="text-lg font-bold text-[#13B5A0] mb-3">
                      Quest Details
                    </h4>
                    <p className="text-gray-600 leading-relaxed text-sm bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      {selectedTask.description}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-[#13B5A0] mb-4">
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
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#13B5A0] text-xs font-bold text-white mt-0.5">
                                {idx + 1}
                              </span>
                              <div>
                                <p className="font-semibold text-[#13B5A0] text-sm">
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
                              <span className="text-sm font-bold text-[#13B5A0] bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 min-w-[70px] text-center">
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
                      <div className="p-2 bg-green-50 rounded-lg text-[#13B5A0]">
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
                      <span className="font-bold text-[#13B5A0]">Deadline</span>
                    </div>
                    <p className="text-gray-600 text-sm font-medium pl-1">
                      {getDeadline(selectedTask.created_at)}
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
                      <span className="font-bold text-[#13B5A0] text-sm">
                        Total Achievement
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-[#13B5A0]">
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
                        <span className="font-bold text-[#13B5A0] text-sm">
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
                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-[#13B5A0] border border-gray-200">
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
                              <p className="text-xs font-semibold text-[#13B5A0] truncate">
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
              <button className="px-5 py-2.5 text-sm font-semibold text-white bg-[#13B5A0] rounded-xl hover:bg-[#13B5A0] transition-all shadow-lg hover:shadow-xl">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-[#13B5A0] mb-6">
              Create New Quest
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="text-sm font-bold text-[#13B5A0]">
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
                  className="flex-1 bg-[#13B5A0] text-white py-3 rounded-xl hover:bg-[#13B5A0] transition font-semibold shadow-sm"
                >
                  Create Quest
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
