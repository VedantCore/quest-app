'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { joinTask, submitStep } from '@/app/actions';
import { useAuth } from '@/context/AuthContext'; //
import TaskDetailsModal from './TaskDetailsModal';
import toast from 'react-hot-toast';

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

export default function TaskList({ userId, onStatsUpdate, mode = 'enrolled' }) {
  const { userRole } = useAuth(); // Get user role
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filter, setFilter] = useState(mode === 'available' ? 'latest' : 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserTasks();
  }, [userId, mode]);

  const fetchUserTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch all tasks with steps AND manager info
      const { data: allTasks, error: tasksError } = await supabase
        .from('tasks')
        .select(
          `
          *,
          task_steps (*),
          manager:users!tasks_assigned_manager_id_fkey (name, email, avatar_url)
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

      // Process tasks
      let processedTasks = allTasks.map((task) => {
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

      // Filter based on mode
      if (mode === 'enrolled') {
        processedTasks = processedTasks.filter((t) => t.isEnrolled);
      } else if (mode === 'available') {
        processedTasks.sort((a, b) => {
          if (a.isEnrolled === b.isEnrolled) return 0;
          return a.isEnrolled ? 1 : -1; // Unenrolled first
        });
      }

      setTasks(processedTasks);

      // Stats calculation logic
      if (onStatsUpdate) {
        const enrolledTasks = processedTasks.filter((t) => t.isEnrolled);
        const activeTasks = enrolledTasks.filter(
          (t) => t.progress < 100
        ).length;
        const completedTasks = enrolledTasks.filter(
          (t) => t.progress === 100
        ).length;
        const totalEarnedPoints = enrolledTasks.reduce(
          (sum, t) => sum + t.earnedPoints,
          0
        );
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
      toast.success('Successfully joined the quest!');
      fetchUserTasks();
    } else {
      toast.error(result.message);
    }
  };

  const handleSubmit = async (stepId) => {
    const result = await submitStep(stepId, userId);
    if (result.success) {
      toast.success('Step submitted for review!');
      fetchUserTasks();
    } else {
      toast.error(result.message);
    }
  };

  // Helper to format deadline
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

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (mode === 'enrolled') {
      if (filter === 'active') return task.isEnrolled && task.progress < 100;
      if (filter === 'completed')
        return task.isEnrolled && task.progress === 100;
      return true;
    } else {
      if (filter === 'my-tasks') return task.isEnrolled;
      return true;
    }
  });

  if (mode === 'available') {
    if (filter === 'latest') {
      filteredTasks.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    } else if (filter === 'oldest') {
      filteredTasks.sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
    }
  }

  const filterOptions =
    mode === 'enrolled'
      ? [
          { key: 'all', label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'completed', label: 'Completed' },
        ]
      : [
          { key: 'latest', label: 'Latest' },
          { key: 'oldest', label: 'Oldest' },
          { key: 'my-tasks', label: 'My Tasks' },
        ];

  return (
    <div className="space-y-6">
      {/* Modal */}
      <TaskDetailsModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onJoin={handleJoin}
        isEnrolled={selectedTask?.isEnrolled}
      />

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
            {filterOptions.map((opt) => (
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

      {/* Info */}
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
          const isStaff = userRole === 'admin' || userRole === 'manager'; // Check if staff

          return (
            <div
              key={task.task_id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-gray-300 flex flex-col h-full"
            >
              {/* Task Header */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-900 leading-tight">
                        {task.title}
                      </h3>
                      {task.isEnrolled ? (
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border ${
                            task.progress === 100
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                          }`}
                        >
                          {task.progress === 100 ? 'Completed' : 'Enrolled'}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed mb-4">
                      {task.description}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-3 ml-1">
                    {task.isEnrolled && (
                      <CircularProgress percentage={task.progress} size={40} />
                    )}
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-xs font-medium text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
                        <svg
                          className="w-3.5 h-3.5 text-indigo-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {task.earnedPoints}/{task.totalPoints} pts
                      </div>
                      <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
                        <span className="text-gray-600">
                          Due: {getDeadline(task.created_at)}
                        </span>
                      </div>
                    </div>
                    {task.manager && (
                      <div
                        className="hidden sm:flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg"
                        title={`Manager: ${task.manager.name}`}
                      >
                        <svg
                          className="w-3.5 h-3.5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        <span className="truncate max-w-[80px]">
                          {task.manager.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTask(task)}
                      className="text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Details
                    </button>

                    {!task.isEnrolled &&
                      !isStaff && ( // Only show if NOT enrolled AND NOT staff
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoin(task.task_id);
                          }}
                          className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                        >
                          Join
                        </button>
                      )}

                    {task.isEnrolled && (
                      <button
                        onClick={() =>
                          setExpandedTaskId(isExpanded ? null : task.task_id)
                        }
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                          isExpanded
                            ? 'bg-gray-200 text-gray-800'
                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                        }`}
                      >
                        {isExpanded ? 'Hide Steps' : 'Show Steps'}
                        <svg
                          viewBox="0 0 24 24"
                          className={`h-3 w-3 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        >
                          <path
                            fill="currentColor"
                            d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Subtasks */}
              {isExpanded && task.isEnrolled && (
                <div className="border-t border-gray-200 bg-gray-50/50 p-4 animate-in slide-in-from-top-2 duration-200">
                  {task.steps && task.steps.length > 0 ? (
                    <div className="space-y-3">
                      {task.steps.map((step, index) => (
                        <div
                          key={step.step_id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            step.status === 'APPROVED'
                              ? 'border-green-200 bg-green-50/50'
                              : 'border-gray-200 bg-white shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                    step.status === 'APPROVED'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  {index + 1}
                                </span>
                                <p
                                  className={`text-sm font-semibold ${
                                    step.status === 'APPROVED'
                                      ? 'text-gray-500 line-through decoration-green-500/50'
                                      : 'text-gray-900'
                                  }`}
                                >
                                  {step.title}
                                </p>
                              </div>
                              {step.description && (
                                <p className="text-xs text-gray-500 mt-1 pl-7">
                                  {step.description}
                                </p>
                              )}
                              <div className="mt-2 pl-7 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-medium border border-gray-200">
                                  +{step.points_reward} pts
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 self-center">
                              {step.status === 'NOT_STARTED' && (
                                <button
                                  onClick={() => handleSubmit(step.step_id)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                  Submit
                                </button>
                              )}
                              {step.status === 'PENDING' && (
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-100 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
                                  Reviewing
                                </span>
                              )}
                              {step.status === 'APPROVED' && (
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                  Done
                                </span>
                              )}
                              {step.status === 'REJECTED' && (
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-100">
                                  Rejected
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-2">
                      No steps available for this quest.
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
