'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { createTask } from '@/app/actions';
import toast from 'react-hot-toast';

export default function TaskManagement() {
  const [tasks, setTasks] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedManagerId: '',
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
      // Fetch tasks with steps
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(
          `
          *,
          task_steps (*)
        `
        )
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Fetch managers
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
    try {
      // Use Server Action
      const result = await createTask(
        {
          ...formData,
          createdBy: (await supabase.auth.getUser()).data.user?.id, // Assuming auth is set up
        },
        steps
      );

      if (result.success) {
        toast.success('Task created successfully!');
        closeModal();
        fetchData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Error saving task: ' + error.message);
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

  const closeModal = () => {
    setShowCreateModal(false);
    setFormData({
      title: '',
      description: '',
      assignedManagerId: '',
    });
    setSteps([{ title: '', description: '', points_reward: 0 }]);
  };

  if (loading) {
    return <div className="text-center py-8">Loading tasks...</div>;
  }

  return (
    <div>
      {/* Header with Create Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Task Management</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
        >
          + Create Task
        </button>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                Assigned Manager
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                Steps
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                Total Points
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                  No tasks found. Create your first task!
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const totalPoints =
                  task.task_steps?.reduce(
                    (sum, step) => sum + (step.points_reward || 0),
                    0
                  ) || 0;
                const isExpanded = expandedTaskId === task.task_id;
                const managerName =
                  managers.find((m) => m.user_id === task.assigned_manager_id)
                    ?.name || 'Unassigned';

                return (
                  <React.Fragment key={task.task_id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setExpandedTaskId(
                                isExpanded ? null : task.task_id
                              )
                            }
                            className="text-gray-500 hover:text-gray-900"
                          >
                            {isExpanded ? '▼' : '▶'}
                          </button>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {task.title}
                            </div>
                            <div className="text-sm text-gray-700 max-w-xs truncate">
                              {task.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {managerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {task.task_steps?.length || 0} steps
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {totalPoints} pts
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-bold rounded-full ${
                            task.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {task.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded Steps Row */}
                    {isExpanded &&
                      task.task_steps &&
                      task.task_steps.length > 0 && (
                        <tr>
                          <td colSpan="5" className="px-6 py-4 bg-gray-50">
                            <div className="ml-8">
                              <h4 className="text-sm font-bold text-gray-900 mb-3">
                                Steps:
                              </h4>
                              <div className="space-y-2">
                                {task.task_steps.map((step) => (
                                  <div
                                    key={step.step_id}
                                    className="flex items-center gap-3 p-2 bg-white rounded border border-gray-200"
                                  >
                                    <span className="flex-1 text-sm font-medium text-gray-900">
                                      {step.title}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                      {step.description}
                                    </span>
                                    <span className="text-sm font-bold text-gray-900">
                                      {step.points_reward} pts
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-8 max-w-3xl w-full mx-4 my-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Create New Task
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 font-medium"
                  placeholder="Enter task title"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 font-medium"
                  rows="3"
                  placeholder="Enter task description"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Assign Manager *
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 font-medium"
                >
                  <option value="">Select a manager</option>
                  {managers.map((manager) => (
                    <option key={manager.user_id} value={manager.user_id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Steps Section */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-bold text-gray-900">
                    Steps *
                  </label>
                  <button
                    type="button"
                    onClick={addStep}
                    className="text-sm bg-gray-200 text-gray-900 px-3 py-1 rounded hover:bg-gray-300 font-semibold"
                  >
                    + Add Step
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {steps.map((step, index) => (
                    <div
                      key={index}
                      className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={step.title}
                          onChange={(e) =>
                            updateStep(index, 'title', e.target.value)
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm text-gray-900 font-medium"
                          placeholder="Step title"
                        />
                        <input
                          type="number"
                          required
                          min="0"
                          value={step.points_reward}
                          onChange={(e) =>
                            updateStep(index, 'points_reward', e.target.value)
                          }
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm text-gray-900 font-medium"
                          placeholder="Points"
                        />
                        {steps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStep(index)}
                            className="text-red-600 hover:text-red-800 font-bold px-2"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm text-gray-900 font-medium"
                        placeholder="Step description (optional)"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-2 text-right">
                  <span className="text-sm font-bold text-gray-900">
                    Total Points:{' '}
                    {steps.reduce(
                      (sum, st) => sum + (parseInt(st.points_reward) || 0),
                      0
                    )}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition font-semibold"
                >
                  Create Task
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gray-300 text-gray-900 py-2 rounded-lg hover:bg-gray-400 transition font-semibold"
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
