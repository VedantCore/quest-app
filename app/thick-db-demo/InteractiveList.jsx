'use client';

import { useState } from 'react';
import { joinTask, submitStep, approveSubmission } from '../actions';

export default function InteractiveList({
  tasks,
  currentUser,
  enrollments,
  mySubmissions,
  pendingSubmissions,
}) {
  const [message, setMessage] = useState('');

  const handleJoin = async (taskId) => {
    const res = await joinTask(taskId, currentUser.user_id);
    setMessage(res.message);
  };

  const handleSubmit = async (stepId) => {
    const res = await submitStep(stepId, currentUser.user_id);
    setMessage(res.message);
  };

  const handleApprove = async (submissionId) => {
    // Simulating manager action
    const res = await approveSubmission(submissionId, 'manager_456');
    setMessage(res.message);
  };

  const isEnrolled = (taskId) => enrollments.some((e) => e.task_id === taskId);
  const getSubmission = (stepId) =>
    mySubmissions.find((s) => s.step_id === stepId);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Thick DB Architecture Demo</h1>

      {message && (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* User View */}
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h2 className="text-xl font-semibold mb-4 flex justify-between items-center">
            <span>User View ({currentUser.name})</span>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
              {currentUser.total_points} Points
            </span>
          </h2>

          <div className="space-y-6">
            {tasks.map((task) => (
              <div key={task.task_id} className="border rounded p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{task.title}</h3>
                  {!isEnrolled(task.task_id) ? (
                    <button
                      onClick={() => handleJoin(task.task_id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Join Task
                    </button>
                  ) : (
                    <span className="text-green-600 text-sm font-medium">
                      Enrolled
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-4">{task.description}</p>

                {isEnrolled(task.task_id) && (
                  <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                    {task.task_steps.map((step) => {
                      const sub = getSubmission(step.step_id);
                      return (
                        <div
                          key={step.step_id}
                          className="flex justify-between items-center bg-gray-50 p-2 rounded"
                        >
                          <div>
                            <p className="font-medium">{step.title}</p>
                            <p className="text-xs text-gray-500">
                              {step.points_reward} pts
                            </p>
                          </div>

                          {!sub ? (
                            <button
                              onClick={() => handleSubmit(step.step_id)}
                              className="bg-indigo-600 text-white px-2 py-1 rounded text-xs hover:bg-indigo-700"
                            >
                              Submit
                            </button>
                          ) : (
                            <span
                              className={`text-xs px-2 py-1 rounded font-medium ${
                                sub.status === 'APPROVED'
                                  ? 'bg-green-100 text-green-800'
                                  : sub.status === 'PENDING'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {sub.status}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Manager View */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-md border">
          <h2 className="text-xl font-semibold mb-4">Manager View</h2>
          <p className="text-sm text-gray-600 mb-4">
            Review pending submissions here.
          </p>

          {pendingSubmissions.length === 0 ? (
            <p className="text-gray-500 italic">No pending submissions.</p>
          ) : (
            <div className="space-y-3">
              {pendingSubmissions.map((sub) => (
                <div
                  key={sub.submission_id}
                  className="bg-white p-3 rounded shadow-sm border"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">
                        Step: {sub.task_steps?.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        User: {sub.users?.name || sub.user_id}
                      </p>
                      <p className="text-xs text-gray-500">
                        Reward: {sub.task_steps?.points_reward} pts
                      </p>
                    </div>
                    <button
                      onClick={() => handleApprove(sub.submission_id)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
