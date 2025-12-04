'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TaskAssignment() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignmentData, setAssignmentData] = useState({
    type: '', // 'task' or 'subtask'
    id: null,
    taskId: null,
    name: '',
    points: 0,
    assignedUserId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch tasks with subtasks and assignments
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
            created_at,
            subtask_assignments (
              assignment_id,
              user_id,
              users (
                user_id,
                name,
                email
              )
            )
          ),
          task_assignments (
            assignment_id,
            user_id,
            users (
              user_id,
              name,
              email
            )
          )
        `
        )
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        throw tasksError;
      }

      console.log('Fetched tasks:', tasksData); // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, name, email, role')
        .neq('role', 'admin')
        .neq('role', 'manager')
        .order('name');

      if (usersError) throw usersError;

      setTasks(tasksData || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error loading tasks: ' + error.message);
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

  const openAssignModal = (type, item, taskId = null) => {
    if (type === 'task') {
      setAssignmentData({
        type: 'task',
        id: item.task_id,
        taskId: item.task_id,
        name: item.heading,
        points: calculateTotalPoints(item.subtasks),
        assignedUserId: '',
      });
    } else {
      setAssignmentData({
        type: 'subtask',
        id: item.subtask_id,
        taskId: taskId,
        name: item.title,
        points: item.points,
        assignedUserId: '',
      });
    }
    setShowAssignModal(true);
  };

  const handleAssign = async () => {
    try {
      const { type, id, taskId, assignedUserId } = assignmentData;

      if (!assignedUserId) {
        alert('Please select a user');
        return;
      }

      if (type === 'task') {
        // Check if assignment already exists
        const { data: existing } = await supabase
          .from('task_assignments')
          .select('assignment_id')
          .eq('task_id', id)
          .single();

        if (existing) {
          // Update existing assignment
          const { error } = await supabase
            .from('task_assignments')
            .update({ user_id: assignedUserId })
            .eq('task_id', id);

          if (error) throw error;
        } else {
          // Create new assignment
          const { error } = await supabase.from('task_assignments').insert({
            task_id: id,
            user_id: assignedUserId,
          });

          if (error) throw error;
        }
      } else {
        // Check if assignment already exists
        const { data: existing } = await supabase
          .from('subtask_assignments')
          .select('assignment_id')
          .eq('subtask_id', id)
          .single();

        if (existing) {
          // Update existing assignment
          const { error } = await supabase
            .from('subtask_assignments')
            .update({ user_id: assignedUserId })
            .eq('subtask_id', id);

          if (error) throw error;
        } else {
          // Create new assignment
          const { error } = await supabase.from('subtask_assignments').insert({
            subtask_id: id,
            user_id: assignedUserId,
          });

          if (error) throw error;
        }
      }

      setShowAssignModal(false);
      fetchData();
    } catch (error) {
      console.error('Error assigning user:', error);
      alert('Error assigning user: ' + error.message);
    }
  };

  const handleUnassign = async (type, id) => {
    if (!confirm('Are you sure you want to unassign this user?')) return;

    try {
      if (type === 'task') {
        const { error } = await supabase
          .from('task_assignments')
          .delete()
          .eq('task_id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('subtask_assignments')
          .delete()
          .eq('subtask_id', id);

        if (error) throw error;
      }

      fetchData();
    } catch (error) {
      console.error('Error unassigning user:', error);
      alert('Error unassigning user: ' + error.message);
    }
  };

  const toggleSubtaskCompletion = async (
    subtaskId,
    currentStatus,
    taskId,
    subtask
  ) => {
    try {
      const newStatus = !currentStatus;

      // Update subtask completion
      const { error: updateError } = await supabase
        .from('subtasks')
        .update({ is_completed: newStatus })
        .eq('subtask_id', subtaskId);

      if (updateError) throw updateError;

      // If marking as complete and user is assigned, award points
      if (newStatus && subtask.subtask_assignments?.[0]?.user_id) {
        const userId = subtask.subtask_assignments[0].user_id;
        const points = subtask.points || 0;

        console.log('Awarding points:', { userId, subtaskId, points });

        // Add points to point_history
        const { error: pointsError } = await supabase
          .from('point_history')
          .insert({
            user_id: userId,
            subtask_id: subtaskId,
            points_earned: points,
          });

        if (pointsError) {
          console.error('Error adding points:', pointsError);
          alert('Error adding points: ' + pointsError.message);
        } else {
          console.log('Points awarded successfully!');
        }
      }

      // Fetch updated subtasks for this task
      const { data: subtasksData } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId);

      // Update task status based on subtasks
      if (subtasksData) {
        const allComplete = subtasksData.every((st) => st.is_completed);
        const newTaskStatus = allComplete ? 'completed' : 'pending';

        await supabase
          .from('tasks')
          .update({ status: newTaskStatus })
          .eq('task_id', taskId);

        // If all subtasks are complete and task is assigned, award total points
        if (allComplete) {
          const { data: taskData } = await supabase
            .from('tasks')
            .select(
              `
              task_id,
              task_assignments (
                user_id
              ),
              subtasks (
                points
              )
            `
            )
            .eq('task_id', taskId)
            .single();

          if (taskData?.task_assignments?.[0]?.user_id) {
            const userId = taskData.task_assignments[0].user_id;
            const totalPoints = calculateTotalPoints(taskData.subtasks);

            // Add points to point_history for task completion
            const { error: taskPointsError } = await supabase
              .from('point_history')
              .insert({
                user_id: userId,
                subtask_id: null,
                points_earned: totalPoints,
              });

            if (taskPointsError) {
              console.error(
                'Error adding task completion points:',
                taskPointsError
              );
              alert('Error adding task points: ' + taskPointsError.message);
            } else {
              console.log('Task completion bonus points awarded!', totalPoints);
            }
          }
        }
      }

      fetchData();
    } catch (error) {
      console.error('Error toggling subtask:', error);
      alert('Error updating subtask: ' + error.message);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading tasks...</div>;
  }

  console.log('Rendering with tasks:', tasks);
  console.log('Number of tasks:', tasks.length);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Task Assignments</h2>
        <p className="text-gray-600 mt-2">
          Assign users to tasks and subtasks. Users will receive points when you
          mark their assigned work as complete.
        </p>
        <div className="mt-2 text-sm text-gray-500">
          Debug: Found {tasks.length} tasks in state
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {tasks.map((task) => {
          const isExpanded = expandedTaskId === task.task_id;
          const totalPoints = calculateTotalPoints(task.subtasks);
          const completedSubtasks =
            task.subtasks?.filter((st) => st.is_completed).length || 0;
          const totalSubtasks = task.subtasks?.length || 0;
          const assignedUser = task.task_assignments?.[0]?.users;

          return (
            <div
              key={task.task_id}
              className="bg-white rounded-lg shadow hover:shadow-md transition"
            >
              {/* Task Header */}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          setExpandedTaskId(isExpanded ? null : task.task_id)
                        }
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <span className="text-xl">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </button>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {task.heading}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {task.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4 ml-10 flex-wrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {task.category}
                      </span>
                      <span className="text-sm text-gray-600">
                        📅 {task.timeline}
                      </span>
                      <span className="text-sm text-gray-600">
                        ⭐ {totalPoints} total points
                      </span>
                      <span className="text-sm text-gray-600">
                        {completedSubtasks}/{totalSubtasks} completed
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          task.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {task.status}
                      </span>
                      {assignedUser && (
                        <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          👤 {assignedUser.name}
                        </span>
                      )}
                    </div>

                    {/* Task Assignment Info */}
                    <div className="mt-4 ml-10 flex items-center gap-2">
                      {assignedUser ? (
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                          <span className="text-sm text-gray-700">
                            🎯 Assigned to: <strong>{assignedUser.name}</strong>
                          </span>
                          <button
                            onClick={() => handleUnassign('task', task.task_id)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openAssignModal('task', task)}
                          className="text-sm bg-black text-white px-3 py-1.5 rounded hover:bg-gray-800 transition"
                        >
                          Assign to User
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Subtasks */}
              {isExpanded && task.subtasks && task.subtasks.length > 0 && (
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Subtasks:
                  </h4>
                  <div className="space-y-2">
                    {task.subtasks.map((subtask) => {
                      const subtaskUser =
                        subtask.subtask_assignments?.[0]?.users;

                      return (
                        <div
                          key={subtask.subtask_id}
                          className="flex items-center justify-between bg-white p-3 rounded border border-gray-200"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <input
                              type="checkbox"
                              checked={subtask.is_completed}
                              onChange={() =>
                                toggleSubtaskCompletion(
                                  subtask.subtask_id,
                                  subtask.is_completed,
                                  task.task_id,
                                  subtask
                                )
                              }
                              className="w-5 h-5 text-black border-gray-300 rounded focus:ring-black cursor-pointer"
                            />
                            <span
                              className={`flex-1 ${
                                subtask.is_completed
                                  ? 'line-through text-gray-500'
                                  : 'text-gray-900'
                              }`}
                            >
                              {subtask.title}
                            </span>
                            <span className="text-sm font-semibold text-gray-700">
                              ⭐ {subtask.points}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            {subtaskUser ? (
                              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded">
                                <span className="text-xs text-gray-700">
                                  👤 {subtaskUser.name}
                                </span>
                                <button
                                  onClick={() =>
                                    handleUnassign(
                                      'subtask',
                                      subtask.subtask_id
                                    )
                                  }
                                  className="text-red-500 hover:text-red-700 text-xs"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() =>
                                  openAssignModal(
                                    'subtask',
                                    subtask,
                                    task.task_id
                                  )
                                }
                                className="text-xs bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-600 transition"
                              >
                                Assign
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No tasks available</p>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">
              Assign {assignmentData.type === 'task' ? 'Task' : 'Subtask'}
            </h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>{assignmentData.name}</strong>
              </p>
              <p className="text-sm text-gray-600">
                Points: <strong>{assignmentData.points}</strong>
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select User
              </label>
              <select
                value={assignmentData.assignedUserId}
                onChange={(e) =>
                  setAssignmentData({
                    ...assignmentData,
                    assignedUserId: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="">-- Select User --</option>
                {users.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAssign}
                className="flex-1 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
              >
                Assign
              </button>
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
