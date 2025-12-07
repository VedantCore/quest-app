'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

/**
 * Admin creates a new task with steps
 */
export async function createTask(taskData, steps) {
  try {
    // 1. Insert Task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: taskData.title,
        description: taskData.description,
        created_by: taskData.createdBy,
        assigned_manager_id: taskData.assignedManagerId,
        is_active: true,
      })
      .select()
      .single();

    if (taskError) throw taskError;

    // 2. Insert Steps
    if (steps && steps.length > 0) {
      const stepsToInsert = steps.map((step) => ({
        task_id: task.task_id,
        title: step.title,
        description: step.description,
        points_reward: parseInt(step.points_reward),
      }));

      const { error: stepsError } = await supabase
        .from('task_steps')
        .insert(stepsToInsert);

      if (stepsError) throw stepsError;
    }

    revalidatePath('/admin-dashboard');
    return { success: true, message: 'Task created successfully!' };
  } catch (error) {
    console.error('Error creating task:', error);
    return {
      success: false,
      message: 'Failed to create task: ' + error.message,
    };
  }
}

/**
 * User joins a task
 */
export async function joinTask(taskId, userId) {
  try {
    const { data, error } = await supabase
      .from('task_enrollments')
      .insert({
        task_id: taskId,
        user_id: userId,
      })
      .select();

    if (error) {
      // Handle UNIQUE constraint gracefully
      if (error.code === '23505') {
        // Postgres unique_violation code
        return {
          success: false,
          message: 'You have already joined this task.',
        };
      }
      throw error;
    }

    revalidatePath('/user-dashboard');
    return { success: true, message: 'Successfully joined task!' };
  } catch (error) {
    console.error('Error joining task:', error);
    return { success: false, message: 'Failed to join task.' };
  }
}

/**
 * User submits a step for review
 */
export async function submitStep(stepId, userId) {
  try {
    const { error } = await supabase.from('step_submissions').insert({
      step_id: stepId,
      user_id: userId,
      status: 'PENDING',
    });

    if (error) {
      if (error.code === '23505') {
        return {
          success: false,
          message: 'You have already submitted this step.',
        };
      }
      throw error;
    }

    revalidatePath('/user-dashboard');
    return { success: true, message: 'Step submitted for review!' };
  } catch (error) {
    console.error('Error submitting step:', error);
    return { success: false, message: 'Failed to submit step.' };
  }
}

/**
 * Manager approves a submission
 * This triggers the DB logic to award points automatically
 */
export async function approveSubmission(submissionId, managerId) {
  try {
    // We only update the status.
    // The DB Trigger 'on_submission_approval' handles the point calculation and insertion.
    const { error } = await supabase
      .from('step_submissions')
      .update({
        status: 'APPROVED',
        reviewed_by: managerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('submission_id', submissionId);

    if (error) throw error;

    // Immediate revalidation to reflect the DB's auto-calculated updates in the UI
    revalidatePath('/manager-dashboard');
    return {
      success: true,
      message: 'Submission approved! Points awarded automatically.',
    };
  } catch (error) {
    console.error('Error approving submission:', error);
    return { success: false, message: 'Failed to approve submission.' };
  }
}

/**
 * Get pending submissions for a manager
 */
export async function getPendingSubmissions(managerId) {
  try {
    // 1. Fetch submissions with user_id
    const { data: submissions, error } = await supabase
      .from('step_submissions')
      .select(
        `
        submission_id,
        status,
        submitted_at,
        user_id,
        step:task_steps (
          title,
          points_reward,
          task:tasks (
            title,
            assigned_manager_id
          )
        )
      `
      )
      .eq('status', 'PENDING')
      .order('submitted_at', { ascending: true });

    if (error) throw error;

    // 2. Fetch user details manually to avoid ambiguous join error
    // (step_submissions has multiple FKs to users: user_id and reviewed_by)
    if (submissions && submissions.length > 0) {
      const userIds = [...new Set(submissions.map((s) => s.user_id))];

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('user_id, email')
        .in('user_id', userIds);

      if (usersError) throw usersError;

      // Map users to submissions
      const userMap = {};
      users.forEach((u) => (userMap[u.user_id] = u));

      const submissionsWithUser = submissions.map((s) => ({
        ...s,
        user: userMap[s.user_id] || { email: 'Unknown' },
      }));

      return { success: true, data: submissionsWithUser };
    }

    return { success: true, data: [] };
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Manager rejects a submission
 */
export async function rejectSubmission(submissionId, managerId) {
  try {
    const { error } = await supabase
      .from('step_submissions')
      .update({
        status: 'REJECTED',
        reviewed_by: managerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('submission_id', submissionId);

    if (error) throw error;

    revalidatePath('/manager-dashboard');
    return {
      success: true,
      message: 'Submission rejected.',
    };
  } catch (error) {
    console.error('Error rejecting submission:', error);
    return { success: false, message: 'Failed to reject submission.' };
  }
}
