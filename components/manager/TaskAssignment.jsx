'use client';
import React, { useState, useEffect } from 'react';
import {
  getPendingSubmissions,
  approveSubmission,
  rejectSubmission,
} from '@/app/actions';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function TaskAssignment() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  useEffect(() => {
    if (user) {
      loadSubmissions();
    }
  }, [user]);

  const loadSubmissions = async () => {
    setLoading(true);
    const result = await getPendingSubmissions(user.uid);
    if (result.success) {
      setSubmissions(result.data || []);
    } else {
      toast.error('Failed to load submissions: ' + result.error);
    }
    setLoading(false);
  };

  const openReviewModal = (submission) => {
    setSelectedSubmission(submission);
    setIsModalOpen(true);
  };

  const closeReviewModal = () => {
    setIsModalOpen(false);
    setSelectedSubmission(null);
  };

  const handleApprove = async () => {
    if (!selectedSubmission) return;

    const submissionId = selectedSubmission.submission_id;
    setProcessingId(submissionId);
    closeReviewModal();

    const result = await approveSubmission(submissionId, user.uid);

    if (result.success) {
      setSubmissions((prev) =>
        prev.filter((s) => s.submission_id !== submissionId)
      );
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setProcessingId(null);
  };

  const handleReject = async () => {
    if (!selectedSubmission) return;

    const submissionId = selectedSubmission.submission_id;
    setProcessingId(submissionId);
    closeReviewModal();

    const result = await rejectSubmission(submissionId, user.uid);

    if (result.success) {
      setSubmissions((prev) =>
        prev.filter((s) => s.submission_id !== submissionId)
      );
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setProcessingId(null);
  };

  if (loading) return <div className="p-4">Loading submissions...</div>;

  return (
    <div className="bg-white shadow rounded-lg p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Pending Submissions</h2>
        <button
          onClick={loadSubmissions}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          Refresh
        </button>
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No pending submissions to review.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task / Step
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted At
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {submissions.map((submission) => (
                <tr key={submission.submission_id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {submission.step?.task?.title || 'Unknown Task'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {submission.step?.title || 'Unknown Step'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {submission.user?.email || 'Unknown User'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-600">
                      {submission.step?.points_reward} pts
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(submission.submitted_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openReviewModal(submission)}
                      disabled={processingId === submission.submission_id}
                      className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                    >
                      {processingId === submission.submission_id
                        ? 'Processing...'
                        : 'Review'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      {isModalOpen && selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 m-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Review Submission
            </h3>

            <div className="mb-6 space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">Task:</span>
                <p className="text-gray-900">
                  {selectedSubmission.step?.task?.title}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Step:</span>
                <p className="text-gray-900">
                  {selectedSubmission.step?.title}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">User:</span>
                <p className="text-gray-900">
                  {selectedSubmission.user?.email}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Points to Award:
                </span>
                <p className="text-gray-900 font-semibold">
                  {selectedSubmission.step?.points_reward}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={closeReviewModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Reject
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
