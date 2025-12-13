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

export default function TaskParticipantsPage() {
  const { taskId } = useParams();
  const { user, userRole, loading } = useAuth();
  const router = useRouter();

  const [task, setTask] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingStepId, setProcessingStepId] = useState(null);

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

    let result;
    if (action === 'approve') {
      result = await approveSubmission(submissionId, user.uid);
    } else {
      result = await rejectSubmission(submissionId, user.uid);
    }

    if (result.success) {
      toast.success(result.message);
      await fetchData();
    } else {
      toast.error(result.message);
    }
    setProcessingStepId(null);
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

  return (
    <div className="min-h-screen font-sans text-[#171717]">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#171717]">{task.title}</h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage participants and submissions
            </p>
          </div>
          <Link
            href="/manager-dashboard"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
            <h2 className="text-lg font-bold text-[#171717]">
              Enrolled Users{' '}
              <span className="text-gray-500 font-normal ml-2">
                ({participants.length})
              </span>
            </h2>
          </div>

          {participants.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No users have joined this task yet.
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
                    Joined:{' '}
                    {new Date(participant.joined_at).toLocaleDateString()}
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
                <p className="text-sm text-gray-500">Task Progress Review</p>
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
                              Step {index + 1}: {step.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {step.description}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                            {step.points_reward} pts
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
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
                                ).toLocaleDateString()}
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
                                  processingStepId === submission.submission_id
                                }
                                className="px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() =>
                                  handleAction(
                                    submission.submission_id,
                                    'approve'
                                  )
                                }
                                disabled={
                                  processingStepId === submission.submission_id
                                }
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 shadow-sm"
                              >
                                Approve
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-center">
                    No steps defined for this task.
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-end">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
