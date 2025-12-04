'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TaskManagement() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    heading: '',
    description: '',
    category: '',
    timeline: '',
  });
  const [subtasks, setSubtasks] = useState([{ title: '', points: 0 }]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(
          `
          *,
          subtasks (
            subtask_id,
            task_id,
            title,
            points,
            is_completed,
            created_at
          )
        `
        )
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPoints = (taskSubtasks) => {
    if (!taskSubtasks || taskSubtasks.length === 0) return 0;
    return taskSubtasks.reduce(
      (sum, subtask) => sum + (subtask.points || 0),
      0
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        // Update existing task
        const { error: taskError } = await supabase
          .from('tasks')
          .update({
            heading: formData.heading,
            description: formData.description,
            category: formData.category,
            timeline: formData.timeline,
          })
          .eq('task_id', editingTask.task_id);

        if (taskError) throw taskError;

        // Delete old subtasks
        await supabase
          .from('subtasks')
          .delete()
          .eq('task_id', editingTask.task_id);

        // Insert updated subtasks
        const subtasksToInsert = subtasks
          .filter((st) => st.title.trim())
          .map((st) => ({
            task_id: editingTask.task_id,
            title: st.title,
            points: parseInt(st.points) || 0,
          }));

        if (subtasksToInsert.length > 0) {
          const { error: subtaskError } = await supabase
            .from('subtasks')
            .insert(subtasksToInsert);

          if (subtaskError) throw subtaskError;
        }
      } else {
        // Create new task
        const { data: newTask, error: taskError } = await supabase
          .from('tasks')
          .insert([
            {
              heading: formData.heading,
              description: formData.description,
              category: formData.category,
              timeline: formData.timeline,
            },
          ])
          .select()
          .single();

        if (taskError) throw taskError;

        // Insert subtasks
        const subtasksToInsert = subtasks
          .filter((st) => st.title.trim())
          .map((st) => ({
            task_id: newTask.task_id,
            title: st.title,
            points: parseInt(st.points) || 0,
          }));

        if (subtasksToInsert.length > 0) {
          const { error: subtaskError } = await supabase
            .from('subtasks')
            .insert(subtasksToInsert);

          if (subtaskError) throw subtaskError;
        }
      }

      // Reset form and close modal
      setFormData({
        heading: '',
        description: '',
        category: '',
        timeline: '',
      });
      setSubtasks([{ title: '', points: 0 }]);
      setShowCreateModal(false);
      setEditingTask(null);
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Error saving task: ' + error.message);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      heading: task.heading || '',
      description: task.description || '',
      category: task.category || '',
      timeline: task.timeline || '',
    });

    // Load existing subtasks
    if (task.subtasks && task.subtasks.length > 0) {
      setSubtasks(
        task.subtasks.map((st) => ({
          title: st.title,
          points: st.points,
        }))
      );
    } else {
      setSubtasks([{ title: '', points: 0 }]);
    }

    setShowCreateModal(true);
  };

  const handleDelete = async (taskId) => {
    if (
      !confirm(
        'Are you sure you want to delete this task? All subtasks will be deleted as well.'
      )
    )
      return;

    try {
      // Subtasks will be deleted automatically due to cascade delete
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('task_id', taskId);

      if (error) throw error;
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task: ' + error.message);
    }
  };

  const addSubtask = () => {
    setSubtasks([...subtasks, { title: '', points: 0 }]);
  };

  const removeSubtask = (index) => {
    const newSubtasks = subtasks.filter((_, i) => i !== index);
    setSubtasks(
      newSubtasks.length > 0 ? newSubtasks : [{ title: '', points: 0 }]
    );
  };

  const updateSubtask = (index, field, value) => {
    const newSubtasks = [...subtasks];
    newSubtasks[index][field] = value;
    setSubtasks(newSubtasks);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingTask(null);
    setFormData({
      heading: '',
      description: '',
      category: '',
      timeline: '',
    });
    setSubtasks([{ title: '', points: 0 }]);
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
                Heading
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                Timeline
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                Subtasks
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                Total Points
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-900 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  No tasks found. Create your first task!
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.task_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">
                      {task.heading}
                    </div>
                    <div className="text-sm text-gray-700 max-w-xs truncate">
                      {task.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-bold rounded-full bg-gray-300 text-gray-900">
                      {task.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {task.timeline
                      ? new Date(task.timeline).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {task.subtasks?.length || 0} subtasks
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {calculateTotalPoints(task.subtasks)} pts
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(task)}
                      className="text-gray-900 hover:text-black mr-4 font-bold underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(task.task_id)}
                      className="text-gray-900 hover:text-black font-bold underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-8 max-w-3xl w-full mx-4 my-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Heading *
                </label>
                <input
                  type="text"
                  required
                  value={formData.heading}
                  onChange={(e) =>
                    setFormData({ ...formData, heading: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Enter task heading"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  rows="3"
                  placeholder="Enter task description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="e.g., Development, Design, Marketing"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Timeline *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.timeline}
                    onChange={(e) =>
                      setFormData({ ...formData, timeline: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Subtasks Section */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-bold text-gray-900">
                    Subtasks *
                  </label>
                  <button
                    type="button"
                    onClick={addSubtask}
                    className="text-sm bg-gray-200 text-gray-900 px-3 py-1 rounded hover:bg-gray-300 font-semibold"
                  >
                    + Add Subtask
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {subtasks.map((subtask, index) => (
                    <div
                      key={index}
                      className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          value={subtask.title}
                          onChange={(e) =>
                            updateSubtask(index, 'title', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                          placeholder="Subtask title"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          required
                          min="0"
                          value={subtask.points}
                          onChange={(e) =>
                            updateSubtask(index, 'points', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                          placeholder="Points"
                        />
                      </div>
                      {subtasks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSubtask(index)}
                          className="text-red-600 hover:text-red-800 font-bold px-2"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-2 text-right">
                  <span className="text-sm font-bold text-gray-900">
                    Total Points:{' '}
                    {subtasks.reduce(
                      (sum, st) => sum + (parseInt(st.points) || 0),
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
                  {editingTask ? 'Update Task' : 'Create Task'}
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
