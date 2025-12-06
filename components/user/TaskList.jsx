'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const CircularProgress = ({ percentage, size = 50, strokeWidth = 4 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-gray-900 transition-all duration-500 ease-out"
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xs font-bold text-gray-900">
        {percentage}%
      </span>
    </div>
  );
};

export default function TaskList({ userId, onStatsUpdate }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, completed
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserTasks();
  }, [userId]);

  const fetchUserTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch tasks assigned to the user
      const { data: taskAssignments, error: taskError } = await supabase
        .from('task_assignments')
        .select(
          `
          assignment_id,
          assigned_at,
          tasks (
            task_id,
            heading,
            description,
            category,
            timeline,
            status,
            created_at,
            subtasks (
              subtask_id,
              title,
              points,
              is_completed,
              created_at
            )
          )
        `
        )
        .eq('user_id', userId);

      // Fetch subtasks assigned to the user
      const { data: subtaskAssignments, error: subtaskError } = await supabase
        .from('subtask_assignments')
        .select(
          `
          assignment_id,
          assigned_at,
          subtasks (
            subtask_id,
            title,
            points,
            is_completed,
            task_id,
            tasks (
              task_id,
              heading,
              description,
              category,
              timeline,
              status
            )
          )
        `
        )
        .eq('user_id', userId);

      if (taskError) throw taskError;
      if (subtaskError) throw subtaskError;

      // Combine and deduplicate tasks
      const allTasks = new Map();

      // Add full task assignments
      taskAssignments?.forEach((assignment) => {
        if (assignment.tasks) {
          allTasks.set(assignment.tasks.task_id, {
            ...assignment.tasks,
            assignmentType: 'full-task',
            assignedAt: assignment.assigned_at,
          });
        }
      });

      // Add tasks from subtask assignments
      subtaskAssignments?.forEach((assignment) => {
        if (assignment.subtasks?.tasks) {
          const taskId = assignment.subtasks.tasks.task_id;
          if (!allTasks.has(taskId)) {
            allTasks.set(taskId, {
              ...assignment.subtasks.tasks,
              subtasks: [],
              assignmentType: 'subtask-only',
              assignedSubtaskIds: [],
            });
          }
          // Add the assigned subtask to the task
          const task = allTasks.get(taskId);
          if (!task.assignedSubtaskIds) {
            task.assignedSubtaskIds = [];
          }
          task.assignedSubtaskIds.push(assignment.subtasks.subtask_id);

          // Add the subtask object itself to the subtasks array
          if (!task.subtasks) {
            task.subtasks = [];
          }
          task.subtasks.push({
            subtask_id: assignment.subtasks.subtask_id,
            title: assignment.subtasks.title,
            points: assignment.subtasks.points,
            is_completed: assignment.subtasks.is_completed,
            task_id: assignment.subtasks.task_id,
          });
        }
      });

      const tasksArray = Array.from(allTasks.values());
      setTasks(tasksArray);

      // Calculate and send stats to parent
      if (onStatsUpdate) {
        const activeTasks = tasksArray.filter(
          (t) => t.status !== 'completed'
        ).length;
        const completedTasks = tasksArray.filter(
          (t) => t.status === 'completed'
        ).length;
        let totalPoints = 0;
        let earnedPoints = 0;
        let completedSubtasks = 0;
        let totalSubtasks = 0;

        tasksArray.forEach((task) => {
          const progress = calculateProgress(
            task.subtasks,
            task.assignedSubtaskIds
          );
          const points = calculatePoints(
            task.subtasks,
            task.assignedSubtaskIds
          );
          totalPoints += points.total;
          earnedPoints += points.earned;
          completedSubtasks += progress.completed;
          totalSubtasks += progress.total;
        });

        const overallProgress =
          totalSubtasks > 0
            ? Math.round((completedSubtasks / totalSubtasks) * 100)
            : 0;

        onStatsUpdate({
          activeTasks,
          completedTasks,
          totalPoints: earnedPoints,
          overallProgress,
        });
      }
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      setError('Something went wrong while loading your tasks.');
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (subtasks, assignedSubtaskIds) => {
    if (!subtasks || subtasks.length === 0)
      return { completed: 0, total: 0, percentage: 0 };

    const relevantSubtasks = assignedSubtaskIds
      ? subtasks.filter((st) => assignedSubtaskIds.includes(st.subtask_id))
      : subtasks;

    const completed = relevantSubtasks.filter((st) => st.is_completed).length;
    const total = relevantSubtasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  };

  const calculatePoints = (subtasks, assignedSubtaskIds) => {
    if (!subtasks || subtasks.length === 0) return { earned: 0, total: 0 };

    const relevantSubtasks = assignedSubtaskIds
      ? subtasks.filter((st) => assignedSubtaskIds.includes(st.subtask_id))
      : subtasks;

    const earned = relevantSubtasks
      .filter((st) => st.is_completed)
      .reduce((sum, st) => sum + (st.points || 0), 0);
    const total = relevantSubtasks.reduce(
      (sum, st) => sum + (st.points || 0),
      0
    );

    return { earned, total };
  };

  if (loading) {
    return (
      <div className="py-10">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-transparent"
              aria-label="Loading"
            ></div>
            <p className="text-gray-600">Loading your tasks…</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="h-5 w-2/3 bg-gray-100 rounded mb-3" />
                <div className="h-4 w-full bg-gray-100 rounded mb-4" />
                <div className="flex gap-2">
                  <div className="h-6 w-24 bg-gray-100 rounded" />
                  <div className="h-6 w-20 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No tasks yet
        </h3>
        <p className="text-gray-600">
          When tasks are assigned, you’ll see them here.
        </p>
      </div>
    );
  }

  // Filter tasks based on selected filter and search
  const filteredTasks = tasks.filter((task) => {
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'active'
        ? task.status !== 'completed'
        : filter === 'completed'
        ? task.status === 'completed'
        : true;
    const matchesSearch =
      task.heading.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Feedback */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by title, description, or category"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              aria-label="Search tasks"
            />
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
            >
              <path
                fill="currentColor"
                d="M10 2a8 8 0 105.293 14.293l4.707 4.707 1.414-1.414-4.707-4.707A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z"
              />
            </svg>
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: `All (${tasks.length})` },
              {
                key: 'active',
                label: `Active (${
                  tasks.filter((t) => t.status !== 'completed').length
                })`,
              },
              {
                key: 'completed',
                label: `Completed (${
                  tasks.filter((t) => t.status === 'completed').length
                })`,
              },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  filter === opt.key
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result info */}
      {filteredTasks.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          Showing {filteredTasks.length}{' '}
          {filteredTasks.length === 1 ? 'task' : 'tasks'}
          {searchQuery ? ` • filtered by "${searchQuery}"` : ''}
        </div>
      )}

      {/* No results */}
      {filteredTasks.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No matching tasks
          </h3>
          <p className="text-gray-600">Try a different search or filter.</p>
        </div>
      )}

      {/* Task Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTasks.map((task) => {
          const isExpanded = expandedTaskId === task.task_id;
          const progress = calculateProgress(
            task.subtasks,
            task.assignedSubtaskIds
          );
          const points = calculatePoints(
            task.subtasks,
            task.assignedSubtaskIds
          );
          const isFullTask = task.assignmentType === 'full-task';

          return (
            <div
              key={task.task_id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow hover:shadow-md"
            >
              {/* Task Header */}
              <div
                className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() =>
                  setExpandedTaskId(isExpanded ? null : task.task_id)
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {task.heading}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                          task.status === 'completed'
                            ? 'bg-black text-white border-black'
                            : task.status === 'in-progress'
                            ? 'bg-gray-200 text-gray-900 border-gray-300'
                            : 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {task.status.replace('-', ' ')}
                      </span>
                      {!isFullTask && (
                        <span className="px-2.5 py-0.5 rounded text-xs font-medium border bg-gray-100 text-gray-800 border-gray-200">
                          Partial assignment
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 text-sm mb-3 leading-relaxed">
                      {task.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-700">
                      <span className="inline-flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded">
                        <span className="font-medium">{task.category}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded">
                        <span className="font-medium">{task.timeline}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-900 px-2.5 py-1 rounded border border-gray-200">
                        <span className="font-bold">
                          {points.earned}/{points.total} pts
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-3 ml-2">
                    <CircularProgress percentage={progress.percentage} />
                    <button
                      className="text-gray-500 hover:text-gray-900"
                      aria-label={isExpanded ? 'Collapse task' : 'Expand task'}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className={`h-6 w-6 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      >
                        <path
                          fill="currentColor"
                          d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Progress Bar - Removed */}
              </div>

              {/* Subtasks - Expanded View */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-5">
                  {task.subtasks && task.subtasks.length > 0 ? (
                    <div className="space-y-3">
                      {task.subtasks
                        .filter((st) =>
                          isFullTask
                            ? true
                            : task.assignedSubtaskIds?.includes(st.subtask_id)
                        )
                        .map((subtask, index) => (
                          <div
                            key={subtask.subtask_id}
                            className={`p-4 rounded-lg border transition-colors ${
                              subtask.is_completed
                                ? 'border-gray-300 bg-gray-100'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p
                                  className={`text-sm font-medium ${
                                    subtask.is_completed
                                      ? 'text-gray-500 line-through'
                                      : 'text-gray-900'
                                  }`}
                                >
                                  {index + 1}. {subtask.title}
                                </p>
                                <div className="mt-1 text-xs text-gray-600">
                                  <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200">
                                    {subtask.points} pts
                                  </span>
                                </div>
                              </div>
                              <span
                                className={`shrink-0 px-2.5 py-1 rounded text-xs font-bold border ${
                                  subtask.is_completed
                                    ? 'bg-black text-white border-black'
                                    : 'bg-gray-100 text-gray-700 border-gray-200'
                                }`}
                              >
                                {subtask.is_completed ? 'Done' : 'Pending'}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      No subtasks available.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
