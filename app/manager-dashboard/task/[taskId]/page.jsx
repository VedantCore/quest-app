'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  getTaskDetails,
  getTaskParticipants,
  approveSubmission,
  rejectSubmission,
} from '@/app/actions';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useLocale } from '@/context/LocaleContext';

export default function TaskParticipantsPage() {
  const { t, locale } = useLocale();
  const { taskId } = useParams();
  const { user, userRole, loading } = useAuth();
  const router = useRouter();

  const [task, setTask] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingStepId, setProcessingStepId] = useState(null);
  const [feedbacks, setFeedbacks] = useState({});
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    if (
      !loading &&
      (!user || (userRole !== 'manager' && userRole !== 'admin'))
    ) {
      router.push('/');
    } else if (
      user &&
      (userRole === 'manager' || userRole === 'admin') &&
      taskId
    ) {
      fetchData();
    }
  }, [user, userRole, loading, router, taskId]);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const [taskRes, participantsRes] = await Promise.all([
        getTaskDetails(taskId),
        getTaskParticipants(taskId),
      ]);

      if (taskRes.success) setTask(taskRes.data);
      else toast.error('Failed to load task details');

      if (participantsRes.success) setParticipants(participantsRes.data || []);
      else toast.error('Failed to load participants');
    } catch (error) {
      console.error(error);
      toast.error('Error loading page data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleUserClick = (participant) => {
    setSelectedUser(participant);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleAction = async (submissionId, action) => {
    if (!submissionId) return;
    setProcessingStepId(submissionId);

    const feedback = feedbacks[submissionId] || '';

    let result;
    if (action === 'approve') {
      result = await approveSubmission(submissionId, user.uid, feedback);
    } else {
      result = await rejectSubmission(submissionId, user.uid, feedback);
    }

    if (result.success) {
      toast.success(result.message);
      // Clear feedback for this submission
      setFeedbacks((prev) => {
        const newFeedbacks = { ...prev };
        delete newFeedbacks[submissionId];
        return newFeedbacks;
      });
      await fetchData();
    } else {
      toast.error(result.message);
    }
    setProcessingStepId(null);
  };

  const handleFeedbackChange = (submissionId, value) => {
    setFeedbacks((prev) => ({
      ...prev,
      [submissionId]: value,
    }));
  };

  useEffect(() => {
    if (selectedUser && participants.length > 0) {
      const updatedUser = participants.find(
        (p) => p.user_id === selectedUser.user_id
      );
      if (updatedUser) setSelectedUser(updatedUser);
    }
  }, [participants]);

  if (loading || isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#171717]"></div>
      </div>
    );
  }

  if (!task) return null;

  const localeMap = {
    en: 'en-US',
    id: 'id-ID',
    ja: 'ja-JP',
    zh: 'zh-CN',
  };

  return (
    <div className="min-h-screen font-sans text-[#171717]">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#171717]">{task.title}</h1>
            <p className="mt-2 text-sm text-gray-500">
              {t('manager.task.manageParticipants')}
            </p>
          </div>
          <Link
            href="/manager-dashboard"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← {t('manager.task.backToDashboard')}
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Task Overview Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
                {t('manager.task.description')}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {task.description || t('manager.dashboard.noDescription')}
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                  {t('manager.task.details')}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <svg
                      className="w-4 h-4 text-gray-500"
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
                    <span className="text-gray-600">
                      {t('manager.company.deadline')}:
                    </span>
                    <span className="font-medium text-gray-900">
                      {new Date(
                        new Date(task.created_at).setDate(
                          new Date(task.created_at).getDate() + 30
                        )
                      ).toLocaleDateString(localeMap[locale] || 'en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="text-gray-600">
                      {t('manager.task.level')}:
                    </span>
                    <span className="font-medium text-gray-900">
                      {task.level || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        task.is_active
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {task.is_active
                        ? t('manager.company.active')
                        : t('manager.company.inactive')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Task Steps Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="w-full px-6 py-4 flex items-center justify-between bg-gray-50/50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              <h2 className="text-lg font-bold text-[#171717]">
                {t('manager.task.questSteps')}{' '}
                <span className="text-gray-500 font-normal ml-2">
                  ({task.task_steps?.length || 0})
                </span>
              </h2>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${
                showSteps ? 'rotate-180' : ''
              }`}
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
          </button>

          {showSteps && (
            <div className="p-6 space-y-3 animate-in slide-in-from-top-2 duration-200">
              {task.task_steps?.length > 0 ? (
                task.task_steps.map((step, idx) => (
                  <div
                    key={step.step_id}
                    className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors"
                  >
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 mb-1">
                        {step.title}
                      </p>
                      {step.description && (
                        <p className="text-sm text-gray-600">
                          {step.description}
                        </p>
                      )}
                    </div>
                    <span className="flex-shrink-0 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-sm border border-indigo-200">
                      {step.points_reward} pts
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic text-center py-4">
                  {t('manager.task.noSteps')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Enrolled Users Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
            <h2 className="text-lg font-bold text-[#171717]">
              {t('manager.task.enrolledUsers')}{' '}
              <span className="text-gray-500 font-normal ml-2">
                ({participants.length})
              </span>
            </h2>
          </div>

          {participants.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {t('manager.task.noUsers')}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {participants.map((participant) => (
                <li
                  key={participant.user_id}
                  onClick={() => handleUserClick(participant)}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-4 group"
                >
                  <div className="flex-shrink-0">
                    {participant.avatar_url ? (
                      <img
                        className="h-10 w-10 rounded-full border border-gray-200 object-cover"
                        src={participant.avatar_url}
                        alt=""
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-[#171717] flex items-center justify-center text-white font-bold text-sm">
                        {(participant.name || participant.email || '?')
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#171717] truncate">
                      {participant.name || participant.email}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {participant.email}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {t('manager.task.joined')}:{' '}
                    {new Date(participant.joined_at).toLocaleDateString(
                      localeMap[locale] || 'en-US'
                    )}
                  </div>
                  <div className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                    {participant.total_points} pts
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-[#171717]">
                  {selectedUser.name || selectedUser.email}
                </h3>
                <p className="text-sm text-gray-500">
                  {t('manager.task.progressReview')}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-[#171717] transition-colors"
              >
                <svg
                  className="w-6 h-6"
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

            <div className="p-6 overflow-y-auto">
              <div className="space-y-4">
                {task.task_steps && task.task_steps.length > 0 ? (
                  task.task_steps.map((step, index) => {
                    const submission = selectedUser.submissions?.find(
                      (s) => s.step_id === step.step_id
                    );
                    const status = submission
                      ? submission.status
                      : 'NOT_STARTED';

                    return (
                      <div
                        key={step.step_id}
                        className="border border-gray-200 rounded-xl p-5 bg-white hover:border-gray-300 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-[#171717] text-sm">
                              {t('manager.task.step')} {index + 1}: {step.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {step.description}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                            {step.points_reward} pts
                          </span>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 mt-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span
                                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                                  status === 'APPROVED'
                                    ? 'bg-green-50 text-green-700 border-green-100'
                                    : status === 'REJECTED'
                                    ? 'bg-red-50 text-red-700 border-red-100'
                                    : status === 'PENDING'
                                    ? 'bg-yellow-50 text-yellow-800 border-yellow-100'
                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                                }`}
                              >
                                {status.replace('_', ' ')}
                              </span>
                              {submission && (
                                <span className="text-xs text-gray-400">
                                  {new Date(
                                    submission.submitted_at
                                  ).toLocaleDateString(
                                    localeMap[locale] || 'en-US'
                                  )}
                                </span>
                              )}
                            </div>

                            {status === 'PENDING' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    handleAction(
                                      submission.submission_id,
                                      'reject'
                                    )
                                  }
                                  disabled={
                                    processingStepId ===
                                    submission.submission_id
                                  }
                                  className="px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                                >
                                  {t('manager.task.reject')}
                                </button>
                                <button
                                  onClick={() =>
                                    handleAction(
                                      submission.submission_id,
                                      'approve'
                                    )
                                  }
                                  disabled={
                                    processingStepId ===
                                    submission.submission_id
                                  }
                                  className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 shadow-sm"
                                >
                                  {t('manager.task.approve')}
                                </button>
                              </div>
                            )}
                          </div>

                          {status === 'PENDING' && submission && (
                            <textarea
                              placeholder={t(
                                'manager.task.feedbackPlaceholder'
                              )}
                              value={feedbacks[submission.submission_id] || ''}
                              onChange={(e) =>
                                handleFeedbackChange(
                                  submission.submission_id,
                                  e.target.value
                                )
                              }
                              className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                              rows={2}
                            />
                          )}

                          {submission?.feedback && (
                            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 mt-2">
                              <span className="font-semibold text-gray-900">
                                {t('manager.task.feedbackLabel')}:
                              </span>{' '}
                              {submission.feedback}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-center">
                    {t('manager.task.noSteps')}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-end">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
              >
                {t('manager.task.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
