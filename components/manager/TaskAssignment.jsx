'use client';
import React, { useState, useEffect } from 'react';
import { getPendingSubmissions, approveSubmission } from '@/app/actions';
import { useAuth } from '@/context/AuthContext';

export default function TaskAssignment() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (user) {
      loadSubmissions();
    }
  }, [user]);

  const loadSubmissions = async () => {
    setLoading(true);
    const result = await getPendingSubmissions(user.id);
    if (result.success) {
      setSubmissions(result.data || []);
    } else {
      alert('Failed to load submissions: ' + result.error);
    }
    setLoading(false);
  };

  const handleApprove = async (submissionId) => {
    if (
      !confirm(
        'Are you sure you want to approve this submission? Points will be awarded immediately.'
      )
    )
      return;

    setProcessingId(submissionId);
    const result = await approveSubmission(submissionId, user.id);

    if (result.success) {
      // Remove from list locally
      setSubmissions((prev) =>
        prev.filter((s) => s.submission_id !== submissionId)
      );
      alert(result.message);
    } else {
      alert(result.message);
    }
    setProcessingId(null);
  };

  if (loading) return <div className="p-4">Loading submissions...</div>;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Pending Submissions</h2>
        <button
          onClick={loadSubmissions}
          className="text-sm text-blue-600 hover:text-blue-800"
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
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {submission.step?.points_reward} pts
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(submission.submitted_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleApprove(submission.submission_id)}
                      disabled={processingId === submission.submission_id}
                      className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md text-sm disabled:opacity-50"
                    >
                      {processingId === submission.submission_id
                        ? 'Processing...'
                        : 'Approve'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
