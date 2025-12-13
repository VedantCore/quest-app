'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getTaskDetails } from '@/app/actions';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';

export default function TaskDetailsPage() {
  const { taskId } = useParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    } else if (taskId) {
      fetchTask();
    }
  }, [user, loading, taskId, router]);

  const fetchTask = async () => {
    setIsLoading(true);
    try {
      const res = await getTaskDetails(taskId);
      if (res.success) {
        setTask(res.data);
      } else {
        toast.error('Failed to load task details');
      }
    } catch (error) {
      console.error('Error fetching task:', error);
      toast.error('Error loading task');
    } finally {
      setIsLoading(false);
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
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    task.is_active
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  {task.is_active ? 'Active' : 'Inactive'}
                </span>
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
          </div>

          <div className="prose max-w-none text-gray-600 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              About this Quest
            </h3>
            <p className="whitespace-pre-wrap">
              {task.description || 'No description provided.'}
            </p>
          </div>
        </div>

        {/* Steps Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Quest Steps</h2>
          {task.task_steps && task.task_steps.length > 0 ? (
            <div className="grid gap-6">
              {task.task_steps.map((step, index) => (
                <div
                  key={step.step_id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                      {index + 1}
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {step.title}
                        </h3>
                        <span className="px-3 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-full border border-yellow-200">
                          {step.points_reward} Points
                        </span>
                      </div>
                      <p className="text-gray-600 leading-relaxed">
                        {step.description}
                      </p>
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
