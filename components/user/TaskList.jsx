'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function TaskList({ userId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  useEffect(() => {
    fetchUserTasks();
  }, [userId]);

  const fetchUserTasks = async () => {
    try {
      setLoading(true);

      // Fetch tasks assigned to the user
      const { data: taskAssignments, error: taskError } = await supabase
        .from('task_assignments')
        .select(
          `
          assignment_id,
          assigned_at,
          tasks (
            task_id,
            heading,
            description,
            category,
            timeline,
            status,
            created_at,
            subtasks (
              subtask_id,
              title,
              points,
              is_completed,
              created_at
            )
          )
        `
        )
        .eq('user_id', userId);

      // Fetch subtasks assigned to the user
      const { data: subtaskAssignments, error: subtaskError } = await supabase
        .from('subtask_assignments')
        .select(
          `
          assignment_id,
          assigned_at,
          subtasks (
            subtask_id,
            title,
            points,
            is_completed,
            task_id,
            tasks (
              task_id,
              heading,
              description,
              category,
              timeline,
              status
            )
          )
        `
        )
        .eq('user_id', userId);

      if (taskError) throw taskError;
      if (subtaskError) throw subtaskError;

      // Combine and deduplicate tasks
      const allTasks = new Map();

      // Add full task assignments
      taskAssignments?.forEach((assignment) => {
        if (assignment.tasks) {
          allTasks.set(assignment.tasks.task_id, {
            ...assignment.tasks,
            assignmentType: 'full-task',
            assignedAt: assignment.assigned_at,
          });
        }
      });

      // Add tasks from subtask assignments
      subtaskAssignments?.forEach((assignment) => {
        if (assignment.subtasks?.tasks) {
          const taskId = assignment.subtasks.tasks.task_id;
          if (!allTasks.has(taskId)) {
            allTasks.set(taskId, {
              ...assignment.subtasks.tasks,
              subtasks: [],
              assignmentType: 'subtask-only',
              assignedSubtaskIds: [],
            });
          }
          // Add the assigned subtask to the task
          const task = allTasks.get(taskId);
          if (!task.assignedSubtaskIds) {
            task.assignedSubtaskIds = [];
          }
          task.assignedSubtaskIds.push(assignment.subtasks.subtask_id);

          // Add the subtask object itself to the subtasks array
          if (!task.subtasks) {
            task.subtasks = [];
          }
          task.subtasks.push({
            subtask_id: assignment.subtasks.subtask_id,
            title: assignment.subtasks.title,
            points: assignment.subtasks.points,
            is_completed: assignment.subtasks.is_completed,
            task_id: assignment.subtasks.task_id,
          });
        }
      });

      setTasks(Array.from(allTasks.values()));
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      alert('Error loading tasks: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (subtasks, assignedSubtaskIds) => {
    if (!subtasks || subtasks.length === 0)
      return { completed: 0, total: 0, percentage: 0 };

    const relevantSubtasks = assignedSubtaskIds
      ? subtasks.filter((st) => assignedSubtaskIds.includes(st.subtask_id))
      : subtasks;

    const completed = relevantSubtasks.filter((st) => st.is_completed).length;
    const total = relevantSubtasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  };

  const calculatePoints = (subtasks, assignedSubtaskIds) => {
    if (!subtasks || subtasks.length === 0) return { earned: 0, total: 0 };

    const relevantSubtasks = assignedSubtaskIds
      ? subtasks.filter((st) => assignedSubtaskIds.includes(st.subtask_id))
      : subtasks;

    const earned = relevantSubtasks
      .filter((st) => st.is_completed)
      .reduce((sum, st) => sum + (st.points || 0), 0);
    const total = relevantSubtasks.reduce(
      (sum, st) => sum + (st.points || 0),
      0
    );

    return { earned, total };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-gray-600">Loading your tasks...</div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No Tasks Assigned
        </h3>
        <p className="text-gray-600">
          You don't have any tasks assigned to you yet. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <span className="text-2xl mr-3">ℹ️</span>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">
              About Your Tasks
            </h3>
            <p className="text-sm text-blue-800">
              You have <strong>{tasks.length}</strong> task(s) assigned to you.
              Complete the subtasks to earn points!
            </p>
          </div>
        </div>
      </div>

      {tasks.map((task) => {
        const isExpanded = expandedTaskId === task.task_id;
        const progress = calculateProgress(
          task.subtasks,
          task.assignedSubtaskIds
        );
        const points = calculatePoints(task.subtasks, task.assignedSubtaskIds);
        const isFullTask = task.assignmentType === 'full-task';

        return (
          <div
            key={task.task_id}
            className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden transition-all hover:shadow-lg"
          >
            {/* Task Header */}
            <div
              className="p-6 cursor-pointer"
              onClick={() =>
                setExpandedTaskId(isExpanded ? null : task.task_id)
              }
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {task.heading}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        task.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : task.status === 'in-progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {task.status}
                    </span>
                    {!isFullTask && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                        Partial Assignment
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-3">
                    {task.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      📁 {task.category}
                    </span>
                    <span className="flex items-center gap-1">
                      ⏰ {task.timeline}
                    </span>
                    <span className="flex items-center gap-1">
                      🎯 {points.earned}/{points.total} points
                    </span>
                  </div>
                </div>
                <button className="ml-4 text-gray-400 hover:text-gray-600">
                  {isExpanded ? '▼' : '▶'}
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>
                    {progress.completed}/{progress.total} subtasks (
                    {progress.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Subtasks - Expanded View */}
            {isExpanded && task.subtasks && task.subtasks.length > 0 && (
              <div className="border-t border-gray-200 bg-gray-50 p-6">
                <h4 className="font-semibold text-gray-900 mb-4">
                  {isFullTask ? 'All Subtasks' : 'Your Assigned Subtasks'}
                </h4>
                <div className="space-y-3">
                  {task.subtasks
                    .filter((st) =>
                      isFullTask
                        ? true
                        : task.assignedSubtaskIds?.includes(st.subtask_id)
                    )
                    .map((subtask) => (
                      <div
                        key={subtask.subtask_id}
                        className={`p-4 rounded-lg border ${
                          subtask.is_completed
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-xl">
                              {subtask.is_completed ? '✅' : '⬜'}
                            </span>
                            <div>
                              <p
                                className={`font-medium ${
                                  subtask.is_completed
                                    ? 'text-green-900 line-through'
                                    : 'text-gray-900'
                                }`}
                              >
                                {subtask.title}
                              </p>
                              <p className="text-sm text-gray-500">
                                {subtask.points} points
                              </p>
                            </div>
                          </div>
                          {subtask.is_completed && (
                            <span className="text-green-600 font-medium">
                              Completed
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
