'use client';
import { useState, useEffect } from 'react';
import { getTaskParticipants } from '@/app/actions';

export default function ManagerTaskDetailsModal({ task, isOpen, onClose }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSteps, setShowSteps] = useState(true);

  useEffect(() => {
    if (isOpen && task?.task_id) {
      fetchParticipants();
    }
  }, [isOpen, task]);

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const res = await getTaskParticipants(task.task_id);
      if (res.success) {
        setParticipants(res.data);
      }
    } catch (error) {
      console.error('Failed to load participants', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !task) return null;

  const getDeadline = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{task.title}</h3>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
              <span className="bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full text-xs font-bold border border-indigo-100">
                {task.task_steps?.length || 0} Steps
              </span>
              <span className="bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full text-xs font-bold border border-indigo-100">
                Deadline: {getDeadline(task.created_at)}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  task.is_active
                    ? 'bg-blue-50 text-blue-700 border-blue-100'
                    : 'bg-red-50 text-red-700 border-red-100'
                }`}
              >
                {task.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-8 bg-white/30">
          {/* Description & Manager Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                  Description
                </h4>
                <div className="text-gray-600 text-sm leading-relaxed bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  {task.description || 'No description provided.'}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                  Assigned Manager
                </h4>
                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold shadow-sm border border-gray-200">
                    {task.manager?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {task.manager?.name || 'Unassigned'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {task.manager?.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div>
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="w-full flex items-center justify-between mb-3 text-sm font-bold text-gray-900 uppercase tracking-wide hover:text-indigo-600 transition-colors"
            >
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4"
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
                Quest Steps ({task.task_steps?.length || 0})
              </span>
              <svg
                className={`w-5 h-5 transition-transform ${
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
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                {task.task_steps?.length > 0 ? (
                  task.task_steps.map((step, idx) => (
                    <div
                      key={step.step_id}
                      className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center hover:border-indigo-200 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {step.title}
                          </p>
                          {step.description && (
                            <p className="text-xs text-gray-500">
                              {step.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-100 whitespace-nowrap">
                        {step.points_reward} pts
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 italic py-2">
                    No steps defined for this quest.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Participants Preview */}
          <div>
            <div className="flex justify-between items-end mb-3">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Current Participants
              </h4>
              <span className="text-xs font-medium text-gray-500">
                Total: {participants.length}
              </span>
            </div>

            {loading ? (
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"
                  />
                ))}
              </div>
            ) : participants.length === 0 ? (
              <div className="text-center py-4 bg-white rounded-xl border border-gray-200 border-dashed text-sm text-gray-500">
                No participants yet.
              </div>
            ) : (
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  {participants.map((p) => (
                    <div
                      key={p.user_id}
                      className="relative group"
                      title={p.name || p.email}
                    >
                      {p.avatar_url ? (
                        <img
                          src={p.avatar_url}
                          alt={p.name}
                          className="h-10 w-10 rounded-full border-2 border-white shadow-sm object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-indigo-600">
                          {p.name?.[0]?.toUpperCase() ||
                            p.email?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-white flex justify-end rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
