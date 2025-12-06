# Fix Subtask Assignments Issue

## Problem

Subtasks are not appearing in the `subtask_assignments` table when assigned to users.

## Root Cause

The issue is likely caused by Row Level Security (RLS) policies that are configured for Supabase Auth (`auth.uid()`) but you're using Firebase Auth instead.

## Solution Steps

### Step 1: Run the SQL Fix

Execute the SQL file `fix-subtask-assignments-rls.sql` in your Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Open and run the `fix-subtask-assignments-rls.sql` file

This will:

- Drop all existing restrictive RLS policies on `subtask_assignments`
- Create a permissive policy that allows all operations
- Grant necessary permissions to anon and authenticated users

### Step 2: Test the Assignment

1. Open your browser's Developer Console (F12)
2. Try to assign a subtask to a user
3. Check the console logs for detailed information:
   - "Checking for existing subtask assignment"
   - "Creating new subtask assignment" or "Updating existing subtask assignment"
   - Any error messages

### Step 3: Verify in Database

After assigning a subtask, check your Supabase database:

```sql
SELECT * FROM subtask_assignments;
```

You should see the new row with:

- `assignment_id`
- `subtask_id`
- `user_id`
- `assigned_at` (timestamp)

### Step 4: Additional Debugging

If the issue persists, check:

1. **Console Errors**: Look for specific error messages in the browser console
2. **Network Tab**: Check the request/response in the Network tab
3. **Supabase Logs**: Check your Supabase project logs for any RLS policy violations

### Common Issues and Solutions

#### Issue 1: PGRST301 - JWT expired

**Solution**: Refresh your Supabase client connection or regenerate your API keys.

#### Issue 2: Policy violation

**Solution**: Ensure you ran the SQL fix correctly and that RLS policies are permissive.

#### Issue 3: Foreign key constraint violation

**Solution**: Verify that:

- The `subtask_id` exists in the `subtasks` table
- The `user_id` exists in the `users` table

```sql
-- Verify subtask exists
SELECT * FROM subtasks WHERE subtask_id = 'YOUR_SUBTASK_ID';

-- Verify user exists
SELECT * FROM users WHERE user_id = 'YOUR_USER_ID';
```

### Alternative: Disable RLS (Development Only)

If you're still having issues and this is a development environment, you can temporarily disable RLS:

```sql
ALTER TABLE subtask_assignments DISABLE ROW LEVEL SECURITY;
```

**WARNING**: Only use this in development. For production, keep RLS enabled with proper policies.

## Code Changes Made

The `TaskAssignment.jsx` component has been updated with:

- Enhanced logging for debugging
- Better error handling
- Proper handling of the "no rows found" error (PGRST116)
- `.select()` call after insert to verify the insertion

## Next Steps

After fixing the RLS policies:

1. Test assigning subtasks to users
2. Verify entries appear in `subtask_assignments` table
3. Check that the assignments display correctly in the manager dashboard
4. Test unassigning subtasks

If you continue to have issues, please check the browser console logs and share the error messages.
