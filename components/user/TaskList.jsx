'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getUserCompanies } from '@/app/actions';
import toast from 'react-hot-toast';
import { useLocale } from '../../context/LocaleContext';

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
  const { userRole } = useAuth();
  const { t, locale } = useLocale();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(mode === 'available' ? 'latest' : 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [companiesLoaded, setCompaniesLoaded] = useState(false);
  const [expandedCompanies, setExpandedCompanies] = useState({});

  const localeMap = {
    en: 'en-US',
    id: 'id-ID',
    ja: 'ja-JP',
    zh: 'zh-CN',
  };

  useEffect(() => {
    fetchUserCompanies();
  }, [userId]);

  useEffect(() => {
    if (companiesLoaded) {
      fetchUserTasks();
    }
  }, [userId, mode, companiesLoaded]);

  // Initialize all companies as expanded when data loads
  useEffect(() => {
    if (companies.length > 0) {
      const initial = {};
      companies.forEach((c) => (initial[c.company_id] = true));
      // Also handle 'other' if needed, though we filter by user companies usually
      initial['other'] = true;
      setExpandedCompanies(initial);
    }
  }, [companies]);

  const fetchUserCompanies = async () => {
    try {
      const result = await getUserCompanies(userId);
      if (result.success) {
        setCompanies(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setCompaniesLoaded(true);
    }
  };

  const fetchUserTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user's company IDs from state
      const userCompanyIds = companies.map((c) => c.company_id);

      // 1. Fetch tasks with steps, manager info, AND company info
      let tasksQuery = supabase
        .from('tasks')
        .select(
          `
          *,
          task_steps (*),
          manager:users!tasks_assigned_manager_id_fkey (name, email, avatar_url),
          companies (company_id, name)
        `
        )
        .eq('is_active', true);

      // Filter by user's companies or selected company
      if (userCompanyIds.length > 0) {
        // Only show tasks from user's assigned companies
        tasksQuery = tasksQuery.in('company_id', userCompanyIds);
      } else {
        // If user has no companies, show NO tasks (or only legacy tasks without company)
        tasksQuery = tasksQuery.is('company_id', null);
      }

      const { data: allTasks, error: tasksError } = await tasksQuery.order(
        'created_at',
        { ascending: false }
      );

      if (tasksError) {
        console.error('Task query error:', tasksError);
        throw tasksError;
      }

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

        // Check if task is expired
        const isExpired = task.deadline
          ? new Date() > new Date(task.deadline)
          : false;

        return {
          ...task,
          isEnrolled,
          isExpired,
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
      setError(t('userDashboard.taskList.error'));
    } finally {
      setLoading(false);
    }
  };

  // Helper to format deadline
  const getDeadline = (dateStr) => {
    if (!dateStr) return t('userDashboard.taskList.noDeadline');
    const date = new Date(dateStr);
    return date.toLocaleDateString(localeMap[locale] || 'en-US', {
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
              aria-label={t('common.loading')}
            ></div>
            <p className="text-gray-600">
              {t('userDashboard.taskList.loading')}
            </p>
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

  // Determine tasks to display based on filters
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

  // Helper to group tasks by company
  const tasksByCompany = {};
  filteredTasks.forEach((task) => {
    const companyId = task.company_id || 'other';
    if (!tasksByCompany[companyId]) {
      tasksByCompany[companyId] = [];
    }
    tasksByCompany[companyId].push(task);
  });

  const filterOptions =
    mode === 'enrolled'
      ? [
          { key: 'all', label: t('userDashboard.taskList.filters.all') },
          { key: 'active', label: t('userDashboard.taskList.filters.active') },
          {
            key: 'completed',
            label: t('userDashboard.taskList.filters.completed'),
          },
        ]
      : [
          { key: 'latest', label: t('userDashboard.taskList.filters.latest') },
          { key: 'oldest', label: t('userDashboard.taskList.filters.oldest') },
          {
            key: 'my-tasks',
            label: t('userDashboard.taskList.filters.myTasks'),
          },
        ];

  const toggleCompany = (companyId) => {
    setExpandedCompanies((prev) => ({
      ...prev,
      [companyId]: !prev[companyId],
    }));
  };

  if (companies.length === 0 && filteredTasks.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {t('userDashboard.taskList.noTasks')}
        </h3>
        <p className="text-gray-600">
          {t('userDashboard.taskList.noCompanies')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder={t('common.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                aria-label={t('userDashboard.taskList.searchAria')}
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
      </div>

      {/* Feedback */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* No results generally */}
      {filteredTasks.length === 0 && !error && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {t('userDashboard.taskList.noResults')}
          </h3>
          <p className="text-gray-600">
            {t('userDashboard.taskList.noResultsSub')}
          </p>
        </div>
      )}

      {/* Grouped Tasks */}
      {companies.map((company) => {
        const companyTasks = tasksByCompany[company.company_id];

        // Show empty processing if no tasks? OR just hide?
        // Current logic filters tasks, so if count is 0, we might want to hide
        // OR show "No active tasks" if the company matches but filters don't.
        // For now, if no tasks match filters, we hide the company section to avoid visual clutter.
        if (!companyTasks || companyTasks.length === 0) return null;

        const isExpanded = expandedCompanies[company.company_id] ?? true;

        return (
          <div
            key={company.company_id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm transition-shadow hover:shadow-md"
          >
            <button
              onClick={() => toggleCompany(company.company_id)}
              className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
                isExpanded
                  ? 'bg-white border-b border-gray-100'
                  : 'bg-gray-50/50 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600">
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
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {company.name}
                  </h2>
                  <p className="text-sm text-gray-500 font-medium">
                    {companyTasks.length}{' '}
                    {companyTasks.length === 1
                      ? t('userDashboard.taskList.task')
                      : t('userDashboard.taskList.tasks')}{' '}
                    {t('userDashboard.taskList.available')}
                  </p>
                </div>
              </div>

              <div
                className={`p-2 rounded-full text-gray-400 transition-transform duration-200 ${
                  isExpanded ? 'rotate-180 bg-gray-100 text-gray-600' : ''
                }`}
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
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="p-4 bg-gray-50/30 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {companyTasks.map((task) => (
                    <div
                      key={task.task_id}
                      onClick={() => router.push(`/tasks/${task.task_id}`)}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-gray-300 flex flex-col h-full cursor-pointer group"
                    >
                      {/* Task Header */}
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
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
                                  {task.progress === 100
                                    ? t('userDashboard.taskList.completed')
                                    : t('userDashboard.taskList.enrolled')}
                                </span>
                              ) : task.isExpired ? (
                                <span className="px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border bg-red-50 text-red-600 border-red-200">
                                  {t('userDashboard.taskList.expired')}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed mb-4">
                              {task.description}
                            </p>
                          </div>

                          <div className="flex flex-col items-center gap-3 ml-1">
                            {task.isEnrolled && (
                              <CircularProgress
                                percentage={task.progress}
                                size={40}
                              />
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
                                {task.earnedPoints}/{task.totalPoints}{' '}
                                {t('userDashboard.taskList.pts')}
                              </div>
                              <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
                                <span
                                  className={
                                    task.isExpired
                                      ? 'text-red-600 font-semibold'
                                      : 'text-gray-600'
                                  }
                                >
                                  {task.deadline
                                    ? `${t(
                                        'userDashboard.taskList.due'
                                      )}: ${getDeadline(task.deadline)}`
                                    : t('userDashboard.taskList.noDeadline')}
                                </span>
                              </div>
                            </div>
                            {task.manager && (
                              <div
                                className="hidden sm:flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg"
                                title={`${t(
                                  'userDashboard.taskList.manager'
                                )}: ${task.manager.name}`}
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
                            <button className="text-xs font-semibold text-gray-600 bg-gray-100 group-hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                              {t('userDashboard.taskList.details')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
