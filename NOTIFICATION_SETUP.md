# Notification System Setup Guide

## Overview

A notification system has been implemented to notify managers when users submit steps for review. Managers will see a notification bell icon in the navbar with a badge showing unread notification count.

## Setup Instructions

### 1. Run the Database Migration

You need to run the SQL migration to create the notifications table in your Supabase database:

**File:** `migrations/20260111_create_notifications_table.sql`

**How to run:**

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy the contents of the migration file
4. Execute the SQL to create the `notifications` table

### 2. Features Implemented

#### For Users:

- When a user submits a step for review, a notification is automatically created for the assigned manager

#### For Managers:

- **Notification Bell Icon**: Appears in the navbar (only for managers)
- **Badge Count**: Shows the number of unread notifications
- **Auto-refresh**: Checks for new notifications every 30 seconds
- **Notification Dropdown**: Click the bell to see all notifications
  - View notification title, message, and timestamp
  - Unread notifications are highlighted in blue
  - Click any notification to navigate to the task review page
  - "Mark all as read" button to clear all unread notifications

### 3. New Files Created

1. **migrations/20260111_create_notifications_table.sql**

   - Database schema for notifications

2. **app/notification-actions.js**

   - Server actions for managing notifications:
     - `createNotification()` - Create a new notification
     - `getManagerNotifications()` - Fetch all notifications for a manager
     - `getUnreadNotificationCount()` - Get count of unread notifications
     - `markNotificationAsRead()` - Mark single notification as read
     - `markAllNotificationsAsRead()` - Mark all notifications as read
     - `deleteNotification()` - Delete a notification
     - `deleteReadNotifications()` - Delete all read notifications

3. **components/NotificationDropdown.jsx**
   - React component for the notification UI

### 4. Modified Files

1. **app/actions.js**

   - Updated `submitStep()` function to create notifications when users submit steps

2. **components/Navbar.jsx**

   - Added NotificationDropdown component (visible only to managers)

3. **locales/en.json, id.json, ja.json, zh.json**
   - Added notification translations for all supported languages

### 5. How It Works

1. **User submits a step**: When a user submits a step for review via the TaskDetailsModal
2. **Notification created**: The system automatically creates a notification for the assigned manager of that task
3. **Manager sees notification**: The manager sees the notification count badge on the bell icon
4. **Manager clicks notification**: Clicking opens the dropdown with all notifications
5. **Navigate to review**: Clicking a specific notification navigates to the task review page and marks it as read

### 6. Notification Types

Currently implemented:

- `STEP_SUBMITTED`: When a user submits a step for review

You can easily extend this to add more notification types like:

- Task updates
- Task completions
- New task assignments
- etc.

### 7. Database Structure

The `notifications` table includes:

- `notification_id`: Unique identifier
- `manager_id`: The manager receiving the notification
- `task_id`: The related task
- `user_id`: The user who triggered the notification
- `step_id`: The related step (optional)
- `submission_id`: The related submission (optional)
- `type`: Notification type (e.g., 'STEP_SUBMITTED')
- `title`: Notification title
- `message`: Notification message
- `is_read`: Read status
- `created_at`: Timestamp of creation
- `read_at`: Timestamp when marked as read

### 8. Future Enhancements

Possible improvements:

- Email notifications for important events
- Push notifications
- Notification preferences/settings
- Different notification types (task updates, comments, etc.)
- Notification history page
- Delete individual notifications

## Testing

To test the notification system:

1. Run the database migration
2. Log in as a user
3. Join a task that has an assigned manager
4. Submit a step for review
5. Log out and log in as the manager
6. Check the notification bell in the navbar
7. Click to view notifications
8. Click a notification to navigate to the review page
