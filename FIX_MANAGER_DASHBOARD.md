# Fix: Manager Dashboard Showing "No tasks available"

## Problem

The manager dashboard is displaying "No tasks available" even though tasks have been created by the admin. This happens because Row Level Security (RLS) policies on the `tasks` and `subtasks` tables are preventing managers from viewing the data.

## Root Cause

The Supabase database has RLS enabled, but there are no policies that allow managers (or any authenticated users) to SELECT/view data from the `tasks` and `subtasks` tables. The previous migration only created policies for `task_assignments` and `subtask_assignments` tables.

## Solution

### Step 1: Run the SQL Fix Script

1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Go to your project
3. Navigate to **SQL Editor** in the left sidebar
4. Create a new query
5. Copy the contents of `fix-tasks-rls-policies.sql` file
6. Paste it into the SQL Editor
7. Click **Run** to execute the script

### Step 2: Verify the Fix

After running the script, the following will be in place:

#### Tasks Table Policies:

- ✅ **All authenticated users** can VIEW tasks (including managers)
- ✅ **Admins** can CREATE, UPDATE, and DELETE tasks
- ✅ **Managers** can UPDATE tasks (for status changes)

#### Subtasks Table Policies:

- ✅ **All authenticated users** can VIEW subtasks (including managers)
- ✅ **Admins** can CREATE, UPDATE, and DELETE subtasks
- ✅ **Managers** can UPDATE subtasks (for marking completion)

### Step 3: Test the Fix

1. Log in as a manager
2. Navigate to the Manager Dashboard
3. You should now see all tasks created by the admin
4. You can:
   - View all tasks and their subtasks
   - Assign users to tasks and subtasks
   - Mark subtasks as complete/incomplete
   - View completion status and points

## How It Works

### Admin Workflow:

1. Admin creates tasks with subtasks in the Admin Dashboard
2. Tasks are stored in the `tasks` table
3. Subtasks are stored in the `subtasks` table

### Manager Workflow:

1. Manager views all tasks in the Manager Dashboard (now possible with RLS policies)
2. Manager assigns users to complete tasks or specific subtasks
3. Assignments are stored in `task_assignments` and `subtask_assignments` tables
4. Manager marks subtasks as complete when users finish them
5. Points are automatically awarded to assigned users

### User Workflow:

1. Users can view tasks assigned to them
2. Users can see their progress and points earned

## Additional Notes

- The RLS policies ensure data security while allowing proper access
- Managers cannot delete tasks, only admins can
- Users can only view tasks, not modify them
- All point calculations are automatic when tasks are marked complete

## Troubleshooting

If you still see "No tasks available" after running the script:

1. **Check if tasks exist**:

   - Log in as admin
   - Verify tasks are visible in the Admin Dashboard
   - Create a test task if none exist

2. **Verify user role**:

   - Make sure your manager account has `role = 'manager'` in the `users` table
   - Check in Supabase Table Editor → users table

3. **Check RLS is working**:

   ```sql
   -- Run this query in Supabase SQL Editor to verify policies
   SELECT * FROM pg_policies WHERE tablename IN ('tasks', 'subtasks');
   ```

4. **Clear browser cache**:

   - Refresh the page (Ctrl+F5)
   - Clear browser cache and cookies
   - Log out and log back in

5. **Check console for errors**:
   - Open browser DevTools (F12)
   - Look for any errors in the Console tab
   - Check Network tab for failed API calls

## Need More Help?

If the issue persists, check:

- Supabase project settings and API keys are correct
- The `lib/supabase.js` configuration is correct
- Network connectivity to Supabase is working
