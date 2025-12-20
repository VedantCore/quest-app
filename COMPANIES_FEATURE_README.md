# Companies Feature Implementation Guide

## Overview

This document outlines the multi-company architecture added to the quest-app, allowing users and managers to be assigned to multiple companies and restricting task visibility based on company assignments.

## Database Changes

### New Tables

#### 1. `companies` Table

Stores company/organization information.

```sql
CREATE TABLE companies (
  company_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT REFERENCES users(user_id)
);
```

#### 2. `user_companies` Junction Table

Manages many-to-many relationships between users and companies.

```sql
CREATE TABLE user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by TEXT REFERENCES users(user_id),
  UNIQUE(user_id, company_id)
);
```

### Modified Tables

#### `tasks` Table

Added `company_id` column to associate tasks with companies.

```sql
ALTER TABLE tasks
ADD COLUMN company_id UUID REFERENCES companies(company_id);

CREATE INDEX idx_tasks_company_id ON tasks(company_id);
```

## Migration Steps

### 1. Run Database Migration

Execute the SQL migration file in your Supabase SQL Editor:

```bash
# File: add-companies-feature.sql
```

This migration:

- Creates `companies` and `user_companies` tables
- Adds `company_id` to `tasks` table
- Sets up Row Level Security (RLS) policies
- Creates helper functions for common queries

### 2. Verify Migration

Check that all tables and indexes were created:

```sql
-- Check tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('companies', 'user_companies');

-- Check column added to tasks
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tasks' AND column_name = 'company_id';
```

## Features

### For Administrators

#### Company Management

- **Create Companies**: Admin dashboard → Companies tab → "Create Company" button
- **View All Companies**: See all companies in the system
- **Delete Companies**: Remove companies (this will cascade delete all assignments)
- **Assign Users to Companies**:
  - Click "View Users" on any company card
  - Click "Assign Users" button
  - Select multiple users/managers to assign
  - Users can be assigned to multiple companies

#### Task Creation with Company Assignment

When creating or editing tasks:

1. Select a company from the "Company" dropdown (required)
2. Only users assigned to that company will be able to see the task
3. Company assignment cannot be changed after task creation (prevent data integrity issues)

### For Managers

#### Company Filtering

- **Filter Tasks by Company**: Use the company dropdown at the top of the dashboard
- **View Tasks by Company**: See only tasks from selected company or all companies
- **Multi-Company Support**: Managers assigned to multiple companies can switch between them

#### Task Assignment

- Can only see and manage tasks from companies they're assigned to
- Task assignments respect company boundaries

### For Users

#### Company-Based Task Access

- **View Tasks**: Users only see tasks from companies they're assigned to
- **Company Filter**: Use the company dropdown in the user dashboard to filter tasks
- **Multi-Company Access**: Users in multiple companies can view tasks from all their companies

## API / Server Actions

### Company Actions (`app/company-actions.js`)

#### Admin-Only Operations

- `createCompanyAction(token, companyData)` - Create a new company
- `updateCompanyAction(token, companyId, updates)` - Update company details
- `deleteCompanyAction(token, companyId)` - Delete a company
- `assignUserToCompanyAction(token, userId, companyId)` - Assign one user
- `bulkAssignUsersToCompanyAction(token, userIds, companyId)` - Assign multiple users
- `removeUserFromCompanyAction(token, userId, companyId)` - Remove user from company

#### General Access Operations

- `getCompaniesAction(token)` - Get companies (filtered by user role)
- `getUserCompaniesAction(token, userId)` - Get companies for a specific user
- `getCompanyUsersAction(token, companyId)` - Get all users in a company

### Task Actions (Updated in `app/actions.js`)

#### Updated Functions

- `createTask(taskData, steps)` - Now includes `companyId` parameter
- `updateTask(taskId, taskData, steps)` - Now includes `companyId` parameter
- `getManagerTasks(managerId, companyId)` - Optional company filter
- `getAllTasks(companyId)` - Optional company filter
- `getUserCompanies(userId)` - Get user's assigned companies
- `getUserTasksByCompany(userId, companyId)` - Get user's tasks filtered by company

## Components

### Admin Components

#### `CompanyManagement.jsx`

Full-featured company management interface:

- Create/delete companies
- View company users
- Bulk assign users to companies
- Remove users from companies

**Usage:**

```jsx
<CompanyManagement allUsers={allUsers} />
```

#### `TaskManagement.jsx` (Updated)

Enhanced with company selection:

- Company dropdown (required) when creating/editing tasks
- Displays company name for existing tasks
- Validates company selection before task creation

### Dashboard Components

#### User Dashboard (`components/user/TaskList.jsx`)

- Company filter dropdown (if user has multiple companies)
- Automatically filters tasks based on selected company
- Shows "All Companies" option

#### Manager Dashboard (`app/manager-dashboard/page.jsx`)

- Company filter at the top of dashboard
- Filters both "My Assigned Tasks" and "All Tasks" tabs
- Persists filter selection across tab switches

## Row Level Security (RLS) Policies

### Companies Table

```sql
-- Users can view companies they're assigned to (or admins see all)
CREATE POLICY "Users view assigned companies" ON companies
FOR SELECT USING (
  company_id IN (
    SELECT company_id FROM user_companies
    WHERE user_id = auth.uid()::text
  )
  OR EXISTS (
    SELECT 1 FROM users
    WHERE user_id = auth.uid()::text AND role = 'admin'
  )
);

-- Only admins can manage companies
CREATE POLICY "Admins manage companies" ON companies
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE user_id = auth.uid()::text AND role = 'admin'
  )
);
```

### User Companies Table

```sql
-- Users can view their own assignments or managers/admins can view all
CREATE POLICY "Users view own company assignments" ON user_companies
FOR SELECT USING (
  user_id = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM users
    WHERE user_id = auth.uid()::text AND role IN ('manager', 'admin')
  )
);

-- Only admins can assign users to companies
CREATE POLICY "Admins assign users to companies" ON user_companies
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE user_id = auth.uid()::text AND role = 'admin'
  )
);
```

### Tasks Table (Updated)

```sql
-- Users view tasks from their assigned companies
CREATE POLICY "Users view company tasks" ON tasks
FOR SELECT USING (
  -- Admin can see all
  EXISTS (
    SELECT 1 FROM users
    WHERE user_id = auth.uid()::text AND role = 'admin'
  )
  OR
  -- Users/managers see tasks from their assigned companies
  (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()::text
    )
  )
  OR
  -- Tasks without company (legacy data)
  company_id IS NULL
);
```

## Usage Examples

### Example 1: Admin Creates Company and Assigns Users

```javascript
// 1. Create a company
const token = await user.getIdToken();
const result = await createCompanyAction(token, {
  name: 'Acme Corp',
  description: 'Main company for Acme products',
});

const companyId = result.data.company_id;

// 2. Assign multiple users to the company
const userIds = ['user1_uid', 'user2_uid', 'manager1_uid'];
await bulkAssignUsersToCompanyAction(token, userIds, companyId);

// 3. Create a task for this company
const taskData = {
  title: 'Complete Product Launch',
  description: 'Launch the new product line',
  companyId: companyId,
  assignedManagerId: 'manager1_uid',
  createdBy: user.uid,
  level: 3,
};

await createTask(taskData, steps);
```

### Example 2: User Filters Tasks by Company

```javascript
// Get user's companies
const companiesResult = await getUserCompanies(userId);
const companies = companiesResult.data;

// Select a company
const selectedCompanyId = companies[0].company_id;

// Fetch tasks filtered by company
const tasksResult = await getUserTasksByCompany(userId, selectedCompanyId);
const tasks = tasksResult.data;
```

### Example 3: Manager Views Tasks from Multiple Companies

```javascript
// Get manager's companies
const companiesResult = await getUserCompanies(managerId);
const companies = companiesResult.data;

// Get all tasks (no filter) - sees tasks from all assigned companies
const allTasksResult = await getManagerTasks(managerId);

// Get tasks from specific company
const companyTasksResult = await getManagerTasks(managerId, companyId);
```

## Testing Checklist

- [ ] Admin can create companies
- [ ] Admin can assign users to multiple companies
- [ ] Admin can remove users from companies
- [ ] Tasks must have a company selected
- [ ] Users only see tasks from their assigned companies
- [ ] Managers only see tasks from their assigned companies
- [ ] Company filter works in user dashboard
- [ ] Company filter works in manager dashboard
- [ ] Admins can see all tasks regardless of company
- [ ] Users in multiple companies can filter by each company
- [ ] Deleting a company removes all user assignments
- [ ] RLS policies prevent unauthorized access

## Troubleshooting

### Issue: Users Can't See Any Tasks

**Solution:** Check if users are assigned to companies:

```sql
SELECT * FROM user_companies WHERE user_id = 'USER_ID';
```

### Issue: Tasks Don't Appear After Filtering

**Solution:** Verify task has company_id set:

```sql
SELECT task_id, title, company_id FROM tasks WHERE task_id = 'TASK_ID';
```

### Issue: Can't Create Task Without Company

**Solution:** This is expected behavior. All new tasks require a company assignment. Update the form to include company selection.

### Issue: Manager Can't See Assigned Tasks

**Solution:** Verify manager is assigned to the same company as the task:

```sql
SELECT t.title, t.company_id, uc.company_id as manager_company
FROM tasks t
LEFT JOIN user_companies uc ON uc.company_id = t.company_id
AND uc.user_id = 'MANAGER_ID'
WHERE t.assigned_manager_id = 'MANAGER_ID';
```

## Future Enhancements

### Potential Features

1. **Company Administrators**: Role between manager and admin that can manage their company
2. **Company Branding**: Custom logos, colors for each company
3. **Company Analytics**: Separate stats per company
4. **Company Hierarchies**: Parent/child company relationships
5. **Company Settings**: Custom configurations per company
6. **Inter-Company Tasks**: Tasks visible across multiple companies
7. **Company Invites**: Company-specific invite codes

### Performance Optimizations

1. Add caching for company lists
2. Implement pagination for company users list
3. Add search functionality for companies
4. Optimize RLS policies with materialized views

## Support

For issues or questions about the companies feature:

1. Check this documentation
2. Review the SQL migration file
3. Check the RLS policies in Supabase Dashboard
4. Verify user company assignments in the database
