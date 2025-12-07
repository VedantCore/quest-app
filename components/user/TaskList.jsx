'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { joinTask, submitStep } from '@/app/actions';

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

      // 1. Fetch all tasks with steps
      const { data: allTasks, error: tasksError } = await supabase
        .from('tasks')
        .select(
          `
          *,
          task_steps (*)
        `
        )
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // 2. Fetch user enrollments
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('task_enrollments')
        .select('task_id')
        .eq('user_id', userId);

      if (enrollmentsError) throw enrollmentsError;

      const enrolledTaskIds = new Set(enrollments?.map((e) => e.task_id));

      // 3. Fetch user submissions
      const { data: submissions, error: submissionsError } = await supabase
        .from('step_submissions')
        .select('*')
        .eq('user_id', userId);

      if (submissionsError) throw submissionsError;

      // Process tasks to include enrollment and submission status
      const processedTasks = allTasks.map((task) => {
        const isEnrolled = enrolledTaskIds.has(task.task_id);

        const stepsWithStatus = task.task_steps.map((step) => {
          const submission = submissions?.find(
            (s) => s.step_id === step.step_id
          );
          return {
            ...step,
            status: submission ? submission.status : 'NOT_STARTED',
            submission_id: submission?.submission_id,
          };
        });

        // Calculate progress
        const totalSteps = stepsWithStatus.length;
        const completedSteps = stepsWithStatus.filter(
          (s) => s.status === 'APPROVED'
        ).length;
        const progress =
          totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

        // Calculate points
        const totalPoints = stepsWithStatus.reduce(
          (sum, s) => sum + (s.points_reward || 0),
          0
        );
        const earnedPoints = stepsWithStatus
          .filter((s) => s.status === 'APPROVED')
          .reduce((sum, s) => sum + (s.points_reward || 0), 0);

        return {
          ...task,
          isEnrolled,
          steps: stepsWithStatus,
          progress,
          totalPoints,
          earnedPoints,
          status:
            progress === 100
              ? 'completed'
              : progress > 0
              ? 'in-progress'
              : 'not-started',
        };
      });

      setTasks(processedTasks);

      // Calculate and send stats to parent
      if (onStatsUpdate) {
        const activeTasks = processedTasks.filter(
          (t) => t.isEnrolled && t.progress < 100
        ).length;
        const completedTasks = processedTasks.filter(
          (t) => t.isEnrolled && t.progress === 100
        ).length;
        const totalEarnedPoints = processedTasks.reduce(
          (sum, t) => sum + (t.isEnrolled ? t.earnedPoints : 0),
          0
        );

        // Overall progress across enrolled tasks
        const enrolledTasks = processedTasks.filter((t) => t.isEnrolled);
        const totalEnrolledSteps = enrolledTasks.reduce(
          (sum, t) => sum + t.steps.length,
          0
        );
        const totalCompletedSteps = enrolledTasks.reduce(
          (sum, t) =>
            sum + t.steps.filter((s) => s.status === 'APPROVED').length,
          0
        );
        const overallProgress =
          totalEnrolledSteps > 0
            ? Math.round((totalCompletedSteps / totalEnrolledSteps) * 100)
            : 0;

        onStatsUpdate({
          activeTasks,
          completedTasks,
          totalPoints: totalEarnedPoints,
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

  const handleJoin = async (taskId) => {
    const result = await joinTask(taskId, userId);
    if (result.success) {
      fetchUserTasks(); // Refresh data
    } else {
      alert(result.message);
    }
  };

  const handleSubmit = async (stepId) => {
    const result = await submitStep(stepId, userId);
    if (result.success) {
      fetchUserTasks(); // Refresh data
    } else {
      alert(result.message);
    }
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
          No tasks available
        </h3>
        <p className="text-gray-600">Check back later for new quests!</p>
      </div>
    );
  }

  // Filter tasks based on selected filter and search
  const filteredTasks = tasks.filter((task) => {
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'active'
        ? task.isEnrolled && task.progress < 100
        : filter === 'completed'
        ? task.isEnrolled && task.progress === 100
        : true;
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
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
              placeholder="Search by title or description"
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
              { key: 'all', label: `All` },
              {
                key: 'active',
                label: `Active`,
              },
              {
                key: 'completed',
                label: `Completed`,
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
                        {task.title}
                      </h3>
                      {task.isEnrolled ? (
                        <span
                          className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                            task.progress === 100
                              ? 'bg-black text-white border-black'
                              : 'bg-green-100 text-green-800 border-green-200'
                          }`}
                        >
                          {task.progress === 100 ? 'Completed' : 'Enrolled'}
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoin(task.task_id);
                          }}
                          className="px-3 py-1 rounded text-xs font-bold bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Join Quest
                        </button>
                      )}
                    </div>
                    <p className="text-gray-700 text-sm mb-3 leading-relaxed">
                      {task.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-700">
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-900 px-2.5 py-1 rounded border border-gray-200">
                        <span className="font-bold">
                          {task.earnedPoints}/{task.totalPoints} pts
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-3 ml-2">
                    <CircularProgress percentage={task.progress} />
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
              </div>

              {/* Subtasks - Expanded View */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-5">
                  {task.steps && task.steps.length > 0 ? (
                    <div className="space-y-3">
                      {task.steps.map((step, index) => (
                        <div
                          key={step.step_id}
                          className={`p-4 rounded-lg border transition-colors ${
                            step.status === 'APPROVED'
                              ? 'border-gray-300 bg-gray-100'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p
                                className={`text-sm font-medium ${
                                  step.status === 'APPROVED'
                                    ? 'text-gray-500 line-through'
                                    : 'text-gray-900'
                                }`}
                              >
                                {index + 1}. {step.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {step.description}
                              </p>
                              <div className="mt-1 text-xs text-gray-600">
                                <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200">
                                  {step.points_reward} pts
                                </span>
                              </div>
                            </div>

                            {task.isEnrolled && (
                              <div className="shrink-0">
                                {step.status === 'NOT_STARTED' && (
                                  <button
                                    onClick={() => handleSubmit(step.step_id)}
                                    className="px-2.5 py-1 rounded text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                                  >
                                    Submit
                                  </button>
                                )}
                                {step.status === 'PENDING' && (
                                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                                    Pending Review
                                  </span>
                                )}
                                {step.status === 'APPROVED' && (
                                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                                    Approved
                                  </span>
                                )}
                                {step.status === 'REJECTED' && (
                                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                                    Rejected
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">No steps available.</p>
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
