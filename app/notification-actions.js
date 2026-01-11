'use server';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

/**
 * Create a notification for a manager
 */
export async function createNotification({
  managerId,
  taskId,
  userId,
  stepId = null,
  submissionId = null,
  type,
  title,
  message,
}) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        manager_id: managerId,
        task_id: taskId,
        user_id: userId,
        step_id: stepId,
        submission_id: submissionId,
        type,
        title,
        message,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all notifications for a manager
 */
export async function getManagerNotifications(managerId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(
        `
        *,
        task:tasks(title, task_id),
        user:users!notifications_user_id_fkey(name, email),
        step:task_steps(title)
      `
      )
      .eq('manager_id', managerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get unread notification count for a manager
 */
export async function getUnreadNotificationCount(managerId) {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('manager_id', managerId)
      .eq('is_read', false);

    if (error) throw error;

    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('notification_id', notificationId);

    if (error) throw error;

    revalidatePath('/manager-dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark all notifications as read for a manager
 */
export async function markAllNotificationsAsRead(managerId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('manager_id', managerId)
      .eq('is_read', false);

    if (error) throw error;

    revalidatePath('/manager-dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('notification_id', notificationId);

    if (error) throw error;

    revalidatePath('/manager-dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete all read notifications for a manager
 */
export async function deleteReadNotifications(managerId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('manager_id', managerId)
      .eq('is_read', true);

    if (error) throw error;

    revalidatePath('/manager-dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error deleting read notifications:', error);
    return { success: false, error: error.message };
  }
}
