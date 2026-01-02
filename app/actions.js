'use server';

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { adminAuth } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';

/**
 * Admin creates a new task with steps
 */
export async function createTask(taskData, steps) {
  try {
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: taskData.title,
        description: taskData.description,
        created_by: taskData.createdBy,
        assigned_manager_id: taskData.assignedManagerId,
        company_id: taskData.companyId,
        deadline: taskData.deadline,
        level: taskData.level,
        is_active: true,
      })
      .select()
      .single();

    if (taskError) throw taskError;

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
 * Admin updates an existing task
 */
export async function updateTask(taskId, taskData, steps) {
  try {
    // 1. Update Task
    const { error: taskError } = await supabase
      .from('tasks')
      .update({
        title: taskData.title,
        description: taskData.description,
        assigned_manager_id: taskData.assignedManagerId,
        company_id: taskData.companyId,
        deadline: taskData.deadline,
        level: taskData.level,
      })
      .eq('task_id', taskId);

    if (taskError) throw taskError;

    // 2. Handle Steps
    if (steps && steps.length > 0) {
      // Get existing step IDs to identify deletions
      const { data: existingSteps } = await supabase
        .from('task_steps')
        .select('step_id')
        .eq('task_id', taskId);

      const currentStepIds = steps
        .filter((s) => s.step_id)
        .map((s) => s.step_id);

      const stepsToDelete = existingSteps
        ?.filter((s) => !currentStepIds.includes(s.step_id))
        .map((s) => s.step_id);

      // Delete removed steps
      if (stepsToDelete && stepsToDelete.length > 0) {
        await supabase.from('task_steps').delete().in('step_id', stepsToDelete);
      }

      // Upsert steps (update existing, insert new)
      for (const step of steps) {
        if (step.step_id) {
          await supabase
            .from('task_steps')
            .update({
              title: step.title,
              description: step.description,
              points_reward: parseInt(step.points_reward),
            })
            .eq('step_id', step.step_id);
        } else {
          await supabase.from('task_steps').insert({
            task_id: taskId,
            title: step.title,
            description: step.description,
            points_reward: parseInt(step.points_reward),
          });
        }
      }
    }

    revalidatePath('/admin-dashboard');
    return { success: true, message: 'Task updated successfully!' };
  } catch (error) {
    console.error('Error updating task:', error);
    return {
      success: false,
      message: 'Failed to update task: ' + error.message,
    };
  }
}

/**
 * Admin deletes a task
 */
export async function deleteTask(taskId) {
  try {
    // Delete task (cascade should handle related steps/enrollments if configured,
    // otherwise we might need to delete them manually first.
    // Assuming cascade delete is set up or we delete related records first)

    // 1. Delete related records if no cascade (safer approach)
    await supabase.from('task_steps').delete().eq('task_id', taskId);
    await supabase.from('task_enrollments').delete().eq('task_id', taskId);

    // 2. Delete the task
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('task_id', taskId);

    if (error) throw error;

    revalidatePath('/admin-dashboard');
    return { success: true, message: 'Task deleted successfully!' };
  } catch (error) {
    console.error('Error deleting task:', error);
    return {
      success: false,
      message: 'Failed to delete task: ' + error.message,
    };
  }
}

/**
 * User joins a task
 */
export async function joinTask(taskId, userId) {
  try {
    // First, check if the task exists and get its deadline
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('task_id, deadline, is_active')
      .eq('task_id', taskId)
      .single();

    if (taskError) throw taskError;

    if (!task) {
      return {
        success: false,
        message: 'Task not found.',
      };
    }

    // Check if task is inactive
    if (!task.is_active) {
      return {
        success: false,
        message: 'This task is no longer active.',
      };
    }

    // Check if deadline has passed
    if (task.deadline) {
      const deadline = new Date(task.deadline);
      const now = new Date();

      if (now > deadline) {
        return {
          success: false,
          message: 'This task has expired. The deadline has passed.',
        };
      }
    }

    const { data, error } = await supabase
      .from('task_enrollments')
      .insert({
        task_id: taskId,
        user_id: userId,
      })
      .select();

    if (error) {
      if (error.code === '23505') {
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
    // Check if submission exists
    const { data: existingSubmission } = await supabase
      .from('step_submissions')
      .select('submission_id, status')
      .eq('step_id', stepId)
      .eq('user_id', userId)
      .single();

    if (existingSubmission) {
      // If already approved, don't allow resubmission
      if (existingSubmission.status === 'APPROVED') {
        return {
          success: false,
          message: 'This step is already approved.',
        };
      }

      // If pending, don't allow resubmission
      if (existingSubmission.status === 'PENDING') {
        return {
          success: false,
          message: 'This step is already pending review.',
        };
      }

      // If REJECTED, update to PENDING
      const { error } = await supabase
        .from('step_submissions')
        .update({
          status: 'PENDING',
          submitted_at: new Date().toISOString(),
        })
        .eq('submission_id', existingSubmission.submission_id);

      if (error) throw error;
    } else {
      // Create new submission
      const { error } = await supabase.from('step_submissions').insert({
        step_id: stepId,
        user_id: userId,
        status: 'PENDING',
      });

      if (error) throw error;
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
 */
export async function approveSubmission(
  submissionId,
  managerId,
  feedback = ''
) {
  try {
    const { error } = await supabase
      .from('step_submissions')
      .update({
        status: 'APPROVED',
        reviewed_by: managerId,
        reviewed_at: new Date().toISOString(),
        feedback: feedback,
      })
      .eq('submission_id', submissionId);

    if (error) throw error;

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
 * Manager rejects a submission
 */
export async function rejectSubmission(submissionId, managerId, feedback = '') {
  try {
    const { error } = await supabase
      .from('step_submissions')
      .update({
        status: 'REJECTED',
        reviewed_by: managerId,
        reviewed_at: new Date().toISOString(),
        feedback: feedback,
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

/**
 * Get pending submissions for a manager
 */
export async function getPendingSubmissions(managerId) {
  try {
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

    if (submissions && submissions.length > 0) {
      const userIds = [...new Set(submissions.map((s) => s.user_id))];

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('user_id, email, name')
        .in('user_id', userIds);

      if (usersError) throw usersError;

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
 * Get tasks assigned to a specific manager (filtered by their companies)
 */
export async function getManagerTasks(managerId, companyId = null) {
  try {
    let query = supabase
      .from('tasks')
      .select(
        `
        *,
        task_steps (*),
        companies (company_id, name)
      `
      )
      .eq('assigned_manager_id', managerId);

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching manager tasks:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all available tasks (Updated to include steps, manager details, and company)
 */
export async function getAllTasks(companyId = null) {
  try {
    let query = supabase.from('tasks').select(
      `
        *,
        task_steps (*),
        manager:users!tasks_assigned_manager_id_fkey (name, email, avatar_url),
        companies (company_id, name)
      `
    );

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching all tasks:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get details of a specific task
 */
export async function getTaskDetails(taskId) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(
        `
        *,
        task_steps (*),
        manager:users!tasks_assigned_manager_id_fkey (name, email, avatar_url),
        companies (company_id, name)
      `
      )
      .eq('task_id', taskId)
      .single();

    if (error) throw error;

    // Fetch manager details manually to avoid ambiguous FK issues
    if (data.assigned_manager_id) {
      const { data: managerData } = await supabase
        .from('users')
        .select('name, email')
        .eq('user_id', data.assigned_manager_id)
        .single();

      if (managerData) {
        data.manager = managerData;
      }
    }

    // Sort steps by creation or some order if needed
    if (data.task_steps) {
      data.task_steps.sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching task details:', error);
    return { success: false, error: error.message };
  }
}
/**
 * Admin deletes a user from Firebase and Supabase
 */
export async function deleteUser(userId) {
  try {
    // 1. Delete from Firebase Authentication
    await adminAuth.deleteUser(userId);

    // 2. Delete from Supabase Users table
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    revalidatePath('/admin-dashboard');
    return { success: true, message: 'User deleted successfully' };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: error.message };
  }
}
/**
 * Get participants for a specific task
 */
export async function getTaskParticipants(taskId) {
  try {
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('task_enrollments')
      .select('user_id, joined_at')
      .eq('task_id', taskId);

    if (enrollmentsError) throw enrollmentsError;

    if (!enrollments || enrollments.length === 0) {
      return { success: true, data: [] };
    }

    const userIds = enrollments.map((e) => e.user_id);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('user_id, name, email, avatar_url, total_points')
      .in('user_id', userIds);

    if (usersError) throw usersError;

    const { data: steps } = await supabase
      .from('task_steps')
      .select('step_id')
      .eq('task_id', taskId);

    const stepIds = steps ? steps.map((s) => s.step_id) : [];

    let submissions = [];
    if (stepIds.length > 0) {
      const { data: subs, error: subsError } = await supabase
        .from('step_submissions')
        .select('*')
        .in('step_id', stepIds)
        .in('user_id', userIds);

      if (subsError) throw subsError;
      submissions = subs || [];
    }

    const participants = users.map((user) => {
      const enrollment = enrollments.find((e) => e.user_id === user.user_id);
      const userSubmissions = submissions.filter(
        (s) => s.user_id === user.user_id
      );

      return {
        ...user,
        joined_at: enrollment.joined_at,
        submissions: userSubmissions,
      };
    });

    return { success: true, data: participants };
  } catch (error) {
    console.error('Error fetching task participants:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's companies for filtering
 */
export async function getUserCompanies(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_companies')
      .select(
        `
        company_id,
        companies (
          company_id,
          name,
          description
        )
      `
      )
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true, data: data.map((uc) => uc.companies) };
  } catch (error) {
    console.error('Error fetching user companies:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's tasks filtered by company
 */
export async function getUserTasksByCompany(userId, companyId = null) {
  try {
    let query = supabase
      .from('task_enrollments')
      .select(
        `
        *,
        tasks (
          *,
          task_steps (*),
          companies (company_id, name)
        )
      `
      )
      .eq('user_id', userId);

    const { data, error } = await query;

    if (error) throw error;

    let tasks = data.map((enrollment) => enrollment.tasks).filter(Boolean);

    // Filter by company if specified
    if (companyId) {
      tasks = tasks.filter((task) => task.company_id === companyId);
    }

    return { success: true, data: tasks };
  } catch (error) {
    console.error('Error fetching user tasks by company:', error);
    return { success: false, error: error.message };
  }
}
