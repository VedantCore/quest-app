'use client';
import { useState, useEffect } from 'react';
import { getTaskParticipants } from '@/app/actions';
import { useAuth } from '@/context/AuthContext'; //

export default function TaskDetailsModal({ task, isOpen, onClose, onJoin, isEnrolled }) {
  const { userRole } = useAuth(); // Get user role
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const isStaff = userRole === 'admin' || userRole === 'manager'; // Check if staff

  // Calculate deadline (Created + 30 days logic)
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
            <h3 className="text-2xl font-bold text-[#13B5A0]">{task.title}</h3>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
              <span className="bg-green-50 text-[#13B5A0] px-2.5 py-0.5 rounded-full text-xs font-bold border border-green-100">
                {task.task_steps?.length || 0} Steps
              </span>
              <span className="bg-green-50 text-[#13B5A0] px-2.5 py-0.5 rounded-full text-xs font-bold border border-green-100">
                Deadline: {getDeadline(task.created_at)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-8 bg-[#faf8eb]/30">
          
          {/* Description & Manager */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">About this Quest</h4>
                <p className="text-gray-600 text-sm leading-relaxed bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  {task.description || "No description provided."}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">Quest Manager</h4>
                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#13B5A0] flex items-center justify-center text-white font-bold shadow-sm">
                    {task.manager?.name?.charAt(0).toUpperCase() || "M"}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-gray-900 truncate">{task.manager?.name || "Unassigned"}</p>
                    <p className="text-xs text-gray-500 truncate">{task.manager?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Steps & Conditions</h4>
            <div className="space-y-2">
              {task.task_steps?.map((step, idx) => (
                <div key={step.step_id} className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{step.title}</p>
                      {step.description && <p className="text-xs text-gray-500">{step.description}</p>}
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-green-50 text-[#13B5A0] px-2 py-1 rounded border border-green-100 whitespace-nowrap">
                    +{step.points_reward} pts
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Participants */}
          <div>
            <div className="flex justify-between items-end mb-3">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Adventurers Joined
              </h4>
              <span className="text-xs font-medium text-gray-500">
                {participants.length} people
              </span>
            </div>
            
            {loading ? (
              <div className="flex gap-2">
                {[1,2,3].map(i => <div key={i} className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />)}
              </div>
            ) : participants.length === 0 ? (
              <div className="text-center py-6 bg-white rounded-xl border border-gray-200 border-dashed text-sm text-gray-500">
                Be the first to join this quest!
              </div>
            ) : (
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  {participants.map((p) => (
                    <div key={p.user_id} className="relative group cursor-help">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt={p.name} className="h-10 w-10 rounded-full border-2 border-white shadow-sm object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-indigo-600">
                          {p.name?.[0]?.toUpperCase() || p.email?.[0]?.toUpperCase()}
                        </div>
                      )}
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                        {p.name || p.email}
                      </div>
                    </div>
                  ))}
                  {participants.length > 10 && (
                    <div className="h-10 w-10 rounded-full bg-gray-50 border-2 border-white shadow-sm flex items-center justify-center text-xs font-medium text-gray-500">
                      +{participants.length - 10}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-gray-100 bg-white flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
          >
            Close
          </button>
          {!isEnrolled && !isStaff && ( // Check if NOT staff
            <button
              onClick={() => {
                onJoin(task.task_id);
                onClose();
              }}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[#13B5A0] rounded-xl hover:bg-[#11a390] shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5"
            >
              Join Quest
            </button>
          )}
        </div>
      </div>
    </div>
  );
}