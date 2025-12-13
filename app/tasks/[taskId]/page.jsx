'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getTaskDetails, joinTask, submitStep } from '@/app/actions';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';

export default function TaskDetailsPage() {
  const { taskId } = useParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingStepId, setSubmittingStepId] = useState(null);

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
        `
        )
        .eq('task_id', taskId)
        .single();

      if (taskError) throw taskError;

      // 2. Fetch enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('task_enrollments')
        .select('task_id')
        .eq('task_id', taskId)
        .eq('user_id', user.uid)
        .single();

      // Ignore error if no enrollment found (it just means not enrolled)
      const isEnrolled = !!enrollment;

      // 3. Fetch submissions if enrolled
      let submissions = [];
      if (isEnrolled) {
        const { data: subs, error: subsError } = await supabase
          .from('step_submissions')
          .select('*')
          .eq('user_id', user.uid)
          .in(
            'step_id',
            taskData.task_steps.map((s) => s.step_id)
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
        };
      });

      // Calculate progress
      const totalSteps = stepsWithStatus.length;
      const completedSteps = stepsWithStatus.filter(
        (s) => s.status === 'APPROVED'
      ).length;
      const progress =
        totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

      setTask({
        ...taskData,
        isEnrolled,
        steps: stepsWithStatus, // Use the processed steps
        progress,
      });
    } catch (error) {
      console.error('Error fetching task:', error);
      toast.error('Error loading task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user) return;
    try {
      const result = await joinTask(taskId, user.uid);
      if (result.success) {
        toast.success('Joined quest successfully!');
        fetchTask(); // Refresh data
      } else {
        toast.error(result.error || 'Failed to join quest');
      }
    } catch (error) {
      console.error('Error joining task:', error);
      toast.error('An error occurred');
    }
  };

  const handleSubmit = async (stepId) => {
    if (!user) return;
    if (!confirm('Are you sure you want to submit this step for review?'))
      return;

    setSubmittingStepId(stepId);
    try {
      const result = await submitStep(stepId, user.uid, 'Submitted for review');
      if (result.success) {
        toast.success('Step submitted successfully!');
        fetchTask(); // Refresh data
      } else {
        toast.error(result.error || 'Failed to submit step');
      }
    } catch (error) {
      console.error('Error submitting step:', error);
      toast.error('An error occurred');
    } finally {
      setSubmittingStepId(null);
    }
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
          <h2 className="text-2xl font-bold text-gray-700">Task not found</h2>
          <button
            onClick={() => router.back()}
            className="mt-4 text-indigo-600 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-12">
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
                    task.is_active
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  {task.is_active ? 'Active' : 'Inactive'}
                </span>
                {task.isEnrolled && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Enrolled
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <span className="font-medium">Level:</span>
                  <span className="text-indigo-600">
                    {'★'.repeat(task.level) + '☆'.repeat(5 - task.level)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">Deadline:</span>
                  <span>
                    {task.deadline
                      ? new Date(task.deadline).toLocaleDateString()
                      : 'No deadline'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">Manager:</span>
                  <span className="text-gray-900 font-medium">
                    {task.manager?.name || 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>

            {!task.isEnrolled && (
              <button
                onClick={handleJoin}
                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg active:scale-95"
              >
                Join Quest
              </button>
            )}
          </div>

          <div className="prose max-w-none text-gray-600 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              About this Quest
            </h3>
            <p className="whitespace-pre-wrap">
              {task.description || 'No description provided.'}
            </p>
            {task.isEnrolled && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Your Progress
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
          <h2 className="text-2xl font-bold text-gray-900">Quest Steps</h2>
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
                          <span className="px-3 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-full border border-yellow-200 whitespace-nowrap">
                            +{step.points_reward} Points
                          </span>

                          {/* Status Badges */}
                          {step.status === 'PENDING' && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full border border-yellow-200 flex items-center gap-1">
                              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                              Reviewing
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
                              Completed
                            </span>
                          )}
                          {step.status === 'REJECTED' && (
                            <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full border border-red-200">
                              Rejected
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-600 leading-relaxed mb-4">
                        {step.description}
                      </p>

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
                                Submitting...
                              </>
                            ) : (
                              'Submit for Review'
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
                            Resubmit
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
              <p className="text-gray-500">No steps defined for this quest.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
