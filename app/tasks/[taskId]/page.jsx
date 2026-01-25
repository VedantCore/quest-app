'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  getTaskDetails,
  joinTask,
  unjoinTask,
  submitStep,
} from '@/app/actions';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';
import { useLocale } from '@/context/LocaleContext';

export default function TaskDetailsPage() {
  const { taskId } = useParams();
  const { user, userRole, loading } = useAuth();
  const { t, locale } = useLocale();
  const router = useRouter();
  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingStepId, setSubmittingStepId] = useState(null);

  const localeMap = {
    en: 'en-US',
    id: 'id-ID',
    ja: 'ja-JP',
    zh: 'zh-CN',
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    } else if (taskId && user) {
      fetchTask();
    }
  }, [user, loading, taskId, router]);

  const fetchTask = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch task details
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(
          `
          *,
          task_steps (*),
          manager:users!tasks_assigned_manager_id_fkey (name, email, avatar_url)
        `,
        )
        .eq('task_id', taskId)
        .single();

      if (taskError) throw taskError;

      // 2. Fetch active enrollment (IN_PROGRESS only)
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('task_enrollments')
        .select('task_id, joined_at')
        .eq('task_id', taskId)
        .eq('user_id', user.uid)
        .eq('status', 'IN_PROGRESS')
        .maybeSingle();

      // Ignore error if no enrollment found (it just means not enrolled)
      const isEnrolled = !!enrollment;

      // 3. Fetch submissions if enrolled (only from current run)
      let submissions = [];
      if (isEnrolled) {
        const { data: subs, error: subsError } = await supabase
          .from('step_submissions')
          .select('*')
          .eq('user_id', user.uid)
          .gte('submitted_at', enrollment.joined_at)
          .in(
            'step_id',
            taskData.task_steps.map((s) => s.step_id),
          );

        if (subsError) throw subsError;
        submissions = subs || [];
      }

      // 4. Merge data
      const stepsWithStatus = taskData.task_steps.map((step) => {
        const submission = submissions.find((s) => s.step_id === step.step_id);
        return {
          ...step,
          status: submission ? submission.status : 'NOT_STARTED',
          submission_id: submission?.submission_id,
          feedback: submission?.feedback,
        };
      });

      // Calculate progress
      const totalSteps = stepsWithStatus.length;
      const completedSteps = stepsWithStatus.filter(
        (s) => s.status === 'APPROVED',
      ).length;
      const progress =
        totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

      // Check if task is expired
      const isExpired = taskData.deadline
        ? new Date() > new Date(taskData.deadline)
        : false;

      setTask({
        ...taskData,
        isEnrolled,
        isExpired,
        steps: stepsWithStatus, // Use the processed steps
        progress,
      });
    } catch (error) {
      console.error('Error fetching task:', error);
      toast.error(t('taskPage.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user) return;
    try {
      const result = await joinTask(taskId, user.uid);
      if (result.success) {
        toast.success(t('taskPage.joinSuccess'));
        fetchTask(); // Refresh data
      } else {
        toast.error(result.error || t('taskPage.joinFailed'));
      }
    } catch (error) {
      console.error('Error joining task:', error);
      toast.error(t('taskPage.errorOccurred'));
    }
  };

  const handleUnjoin = async () => {
    if (!user) return;

    // Show confirmation dialog
    if (!confirm(t('taskPage.unjoinConfirm'))) {
      return;
    }

    try {
      const result = await unjoinTask(taskId, user.uid);
      if (result.success) {
        toast.success(t('taskPage.unjoinSuccess'));
        fetchTask(); // Refresh data
      } else {
        toast.error(result.message || t('taskPage.unjoinFailed'));
      }
    } catch (error) {
      console.error('Error unjoining task:', error);
      toast.error(t('taskPage.errorOccurred'));
    }
  };

  const handleSubmit = async (stepId) => {
    if (!user) return;

    setSubmittingStepId(stepId);

    const submitAction = async () => {
      const result = await submitStep(stepId, user.uid);
      if (!result.success) {
        throw new Error(result.message || t('taskPage.joinFailed'));
      }
      return result;
    };

    toast
      .promise(submitAction(), {
        loading: t('taskPage.submittingStep'),
        success: () => {
          fetchTask(); // Refresh data
          return t('taskPage.stepSubmitted');
        },
        error: (err) => err.message || t('taskPage.errorOccurred'),
      })
      .finally(() => {
        setSubmittingStepId(null);
      });
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-700">
            {t('taskPage.taskNotFound')}
          </h2>
          <button
            onClick={() => router.back()}
            className="mt-4 text-indigo-600 hover:underline"
          >
            {t('taskPage.goBack')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-12">
        <button
          onClick={() => router.push('/tasks')}
          className="mb-6 flex items-center text-gray-600 hover:text-indigo-600 transition-colors font-medium"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          {t('taskPage.backToTasks')}
        </button>

        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {task.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    task.isExpired
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : task.is_active
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  {task.isExpired
                    ? t('userDashboard.taskList.expired')
                    : task.is_active
                      ? t('taskPage.active')
                      : t('taskPage.inactive')}
                </span>
                {task.isEnrolled && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {t('userDashboard.taskList.enrolled')}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <span className="font-medium">{t('taskPage.level')}:</span>
                  <span className="text-indigo-600">
                    {'★'.repeat(task.level) + '☆'.repeat(5 - task.level)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">
                    {t('userDashboard.taskDetails.deadline')}:
                  </span>
                  <span
                    className={
                      task.isExpired ? 'text-red-600 font-semibold' : ''
                    }
                  >
                    {task.deadline
                      ? new Date(task.deadline).toLocaleDateString(
                          localeMap[locale] || 'en-US',
                        )
                      : t('userDashboard.taskList.noDeadline')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">
                    {t('userDashboard.taskList.manager')}:
                  </span>
                  <span className="text-gray-900 font-medium">
                    {task.manager?.name ||
                      t('userDashboard.taskDetails.unassigned')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {!task.isEnrolled &&
                (userRole === 'user' || userRole === 'manager') &&
                !task.isExpired && (
                  <button
                    onClick={handleJoin}
                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg active:scale-95"
                  >
                    {t('userDashboard.taskDetails.joinQuest')}
                  </button>
                )}

              {task.isEnrolled &&
                (userRole === 'user' || userRole === 'manager') && (
                  <button
                    onClick={handleUnjoin}
                    className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-md hover:shadow-lg active:scale-95"
                  >
                    {t('taskPage.leaveQuest')}
                  </button>
                )}

              {!task.isEnrolled &&
                (userRole === 'user' || userRole === 'manager') &&
                task.isExpired && (
                  <div className="px-6 py-3 bg-red-50 text-red-700 font-bold rounded-xl border-2 border-red-200">
                    {t('userDashboard.taskDetails.questExpired')}
                  </div>
                )}
            </div>
          </div>

          <div className="prose max-w-none text-gray-600 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {t('userDashboard.taskDetails.about')}
            </h3>
            <p className="whitespace-pre-wrap">
              {task.description || t('userDashboard.taskDetails.noDescription')}
            </p>
            {task.isEnrolled && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {t('taskPage.yourProgress')}
                  </span>
                  <span className="text-sm font-bold text-indigo-600">
                    {task.progress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${task.progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Steps Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('taskPage.questSteps')}
          </h2>
          {task.steps && task.steps.length > 0 ? (
            <div className="grid gap-6">
              {task.steps.map((step, index) => (
                <div
                  key={step.step_id}
                  className={`rounded-xl shadow-sm border p-6 transition-all hover:shadow-md ${
                    step.status === 'APPROVED'
                      ? 'bg-green-50/50 border-green-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        step.status === 'APPROVED'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-indigo-50 text-indigo-600'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-grow w-full">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                        <h3
                          className={`text-lg font-bold ${
                            step.status === 'APPROVED'
                              ? 'text-gray-700 line-through'
                              : 'text-gray-900'
                          }`}
                        >
                          {step.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 text-xs font-bold rounded-full border whitespace-nowrap ${
                              step.points_reward >= 0
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {step.points_reward >= 0 ? '+' : '-'}
                            {Math.abs(step.points_reward)} {t('common.pts')}
                          </span>

                          {/* Status Badges */}
                          {step.status === 'PENDING' && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full border border-yellow-200 flex items-center gap-1">
                              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                              {t('taskPage.reviewing')}
                            </span>
                          )}
                          {step.status === 'APPROVED' && (
                            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-200 flex items-center gap-1">
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
                              {t('taskPage.completed')}
                            </span>
                          )}
                          {step.status === 'REJECTED' && (
                            <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full border border-red-200">
                              {t('taskPage.rejected')}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-600 leading-relaxed mb-4">
                        {step.description}
                      </p>

                      {/* Feedback Display */}
                      {step.feedback && (
                        <div
                          className={`mb-4 p-4 rounded-lg text-sm border ${
                            step.status === 'REJECTED'
                              ? 'bg-red-50 border-red-100 text-red-800'
                              : 'bg-gray-50 border-gray-100 text-gray-700'
                          }`}
                        >
                          <span className="font-bold block mb-1">
                            {t('taskPage.managerFeedback')}
                          </span>
                          {step.feedback}
                        </div>
                      )}

                      {/* Action Buttons */}
                      {task.isEnrolled && step.status === 'NOT_STARTED' && (
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleSubmit(step.step_id)}
                            disabled={submittingStepId === step.step_id}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {submittingStepId === step.step_id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                {t('taskPage.submitting')}
                              </>
                            ) : (
                              t('taskPage.submitForReview')
                            )}
                          </button>
                        </div>
                      )}

                      {task.isEnrolled && step.status === 'REJECTED' && (
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleSubmit(step.step_id)}
                            disabled={submittingStepId === step.step_id}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {t('taskPage.resubmit')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
              <p className="text-gray-500">{t('taskPage.noSteps')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
