# Manager Dashboard - Setup Guide

## Overview

The Manager Dashboard allows managers to assign users to tasks and subtasks. When a manager marks a subtask or task as complete, the assigned user automatically receives points.

## Features

- ✅ Assign users to entire tasks (they receive all points when all subtasks are complete)
- ✅ Assign users to individual subtasks (they receive points when that specific subtask is complete)
- ✅ Automatic point distribution to `point_history` table
- ✅ Visual tracking of assignments and completion status
- ✅ Unassign users from tasks/subtasks

## Setup Instructions

### Step 1: Run Database Migration

1. Open your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-migration.sql`
4. Click "Run" to execute the migration
5. Verify that the following tables are created:
   - `task_assignments`
   - `subtask_assignments`

### Step 2: Update User Roles

Make sure you have users with the "manager" role in your database:

```sql
-- Update a user to be a manager
UPDATE users
SET role = 'manager'
WHERE email = 'manager@example.com';
```

### Step 3: Access Manager Dashboard

- Navigate to `/manager-dashboard` in your application
- Only users with `role = 'manager'` can access this page

## How It Works

### Task Assignment Flow

1. **Manager assigns a user to a task**

   - The user is responsible for the entire task
   - When ALL subtasks are marked complete, the user receives the total points from all subtasks

2. **Manager assigns a user to a subtask**
   - The user is responsible for that specific subtask only
   - When that subtask is marked complete, the user receives the points for that subtask

### Point Distribution Logic

#### Subtask Completion

```javascript
// When a subtask is marked complete:
if (subtask is completed AND user is assigned) {
  // Add entry to point_history
  {
    user_id: assigned_user_id,
    subtask_id: subtask_id,
    points_earned: subtask.points
  }
}
```

#### Task Completion

```javascript
// When ALL subtasks are complete:
if (all subtasks complete AND user assigned to task) {
  // Add entry to point_history
  {
    user_id: assigned_user_id,
    subtask_id: null, // null indicates task-level completion
    points_earned: sum of all subtask points
  }
}
```

## Database Schema

### task_assignments

```sql
- assignment_id (UUID, Primary Key)
- task_id (UUID, Foreign Key -> tasks)
- user_id (TEXT, Foreign Key -> users)
- assigned_at (TIMESTAMPTZ)
- UNIQUE constraint on task_id (one user per task)
```

### subtask_assignments

```sql
- assignment_id (UUID, Primary Key)
- subtask_id (UUID, Foreign Key -> subtasks)
- user_id (TEXT, Foreign Key -> users)
- assigned_at (TIMESTAMPTZ)
- UNIQUE constraint on subtask_id (one user per subtask)
```

### point_history (existing table)

```sql
- history_id (UUID, Primary Key)
- user_id (TEXT, Foreign Key -> users)
- subtask_id (UUID, nullable, Foreign Key -> subtasks)
- points_earned (INT4)
- earned_at (TIMESTAMPTZ)
```

## Usage Examples

### Example 1: Assigning a Subtask

1. Click "Assign" next to a subtask
2. Select a user from the dropdown
3. Click "Assign"
4. The user's name appears next to the subtask

### Example 2: Completing a Subtask

1. Check the checkbox next to an assigned subtask
2. The subtask is marked complete
3. Points are automatically added to the assigned user's point_history

### Example 3: Assigning a Full Task

1. Click "Assign to User" at the task level
2. Select a user from the dropdown
3. Click "Assign"
4. When all subtasks are complete, the user receives the total points

## Important Notes

⚠️ **Point Distribution Rules:**

- Points are only awarded when marking as complete (not when unmarking)
- A user assigned to a TASK receives points when ALL subtasks are complete
- A user assigned to a SUBTASK receives points when that specific subtask is complete
- If both task and subtask assignments exist, the subtask assignment takes precedence

⚠️ **Constraints:**

- Only ONE user can be assigned to a task
- Only ONE user can be assigned to a subtask
- Assignments cascade delete (deleting a task/subtask removes its assignments)

## API Reference

### Fetch Tasks with Assignments

```javascript
const { data } = await supabase.from('tasks').select(`
    *,
    subtasks (
      *,
      subtask_assignments (
        assignment_id,
        user_id,
        users (name, email)
      )
    ),
    task_assignments (
      assignment_id,
      user_id,
      users (name, email)
    )
  `);
```

### Create Task Assignment

```javascript
await supabase.from('task_assignments').insert({
  task_id: 'task-uuid',
  user_id: 'user-id',
});
```

### Create Subtask Assignment

```javascript
await supabase.from('subtask_assignments').insert({
  subtask_id: 'subtask-uuid',
  user_id: 'user-id',
});
```

### Award Points

```javascript
await supabase.from('point_history').insert({
  user_id: 'user-id',
  subtask_id: 'subtask-uuid', // or null for task-level
  points_earned: points,
});
```

## Troubleshooting

### Issue: Can't access manager dashboard

- Check that your user has `role = 'manager'` in the users table
- Clear browser cache and try again

### Issue: Assignments not showing

- Verify RLS policies are enabled
- Check that the migration ran successfully

### Issue: Points not being awarded

- Check the point_history table for entries
- Verify the user is assigned before marking complete
- Check browser console for errors

## Future Enhancements

- [ ] Notification system when points are awarded
- [ ] Analytics dashboard for managers
- [ ] Bulk assignment features
- [ ] Point adjustment/override capabilities
- [ ] Assignment history tracking
