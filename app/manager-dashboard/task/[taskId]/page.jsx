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

export default function TaskParticipantsPage() {
  const { taskId } = useParams();
  const { user, userRole, loading } = useAuth();
  const router = useRouter();

  const [task, setTask] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingStepId, setProcessingStepId] = useState(null);

  useEffect(() => {
    if (!loading && (!user || userRole !== 'manager')) {
      router.push('/');
    } else if (user && userRole === 'manager' && taskId) {
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
      // Refresh data to update UI
      await fetchData();
      // Update selected user data locally to reflect changes immediately in modal if needed
      // But fetching data refreshes participants, so we need to re-select the user from the new list
      // to update the modal view.
      // Actually, fetchData updates `participants`. We need to sync `selectedUser` with the new data.
    } else {
      toast.error(result.message);
    }
    setProcessingStepId(null);
  };

  // Sync selectedUser with participants when participants update
  useEffect(() => {
    if (selectedUser && participants.length > 0) {
      const updatedUser = participants.find(
        (p) => p.user_id === selectedUser.user_id
      );
      if (updatedUser) {
        setSelectedUser(updatedUser);
      }
    }
  }, [participants]);

  if (loading || isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-xl text-red-500 mb-4">Task not found</div>
        <Link
          href="/manager-dashboard"
          className="text-blue-600 hover:underline"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{task.title}</h1>
            <p className="mt-1 text-sm text-gray-500">Task Participants</p>
          </div>
          <Link
            href="/manager-dashboard"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pb-12">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Enrolled Users ({participants.length})
            </h2>
          </div>

          {participants.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No users have joined this task yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {participants.map((participant) => (
                <li
                  key={participant.user_id}
                  onClick={() => handleUserClick(participant)}
                  className="px-6 py-4 hover:bg-blue-50 cursor-pointer transition"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {participant.avatar_url ? (
                        <img
                          className="h-10 w-10 rounded-full"
                          src={participant.avatar_url}
                          alt=""
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                          {participant.email[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {participant.name || participant.email}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {participant.email}
                      </p>
                    </div>
                    <div className="inline-flex items-center text-sm text-gray-500 mr-4">
                      Joined:{' '}
                      {new Date(participant.joined_at).toLocaleDateString()}
                    </div>
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {participant.total_points} pts
                    </div>
                    <div className="ml-4 text-gray-400">→</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedUser.name || selectedUser.email}'s Progress
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-500 text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-6">
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
                        className="border rounded-lg p-4 bg-gray-50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              Step {index + 1}: {step.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {step.description}
                            </p>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {step.points_reward} pts
                          </span>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                          <div className="text-sm">
                            <span className="font-medium text-gray-500">
                              Status:{' '}
                            </span>
                            <span
                              className={`font-semibold ${
                                status === 'APPROVED'
                                  ? 'text-green-600'
                                  : status === 'REJECTED'
                                  ? 'text-red-600'
                                  : status === 'PENDING'
                                  ? 'text-yellow-600'
                                  : 'text-gray-400'
                              }`}
                            >
                              {status.replace('_', ' ')}
                            </span>
                            {submission && (
                              <div className="text-xs text-gray-400 mt-1">
                                Submitted:{' '}
                                {new Date(
                                  submission.submitted_at
                                ).toLocaleString()}
                              </div>
                            )}
                          </div>

                          {status === 'PENDING' && (
                            <div className="flex space-x-2">
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
                                className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
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
                                className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
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
                  <p className="text-gray-500">
                    No steps defined for this task.
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
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
