# Points System Test Suite

This folder contains test scripts and scenarios for verifying the points system functionality in the Quest App.

## Overview

The test suite covers all point-related operations:

- Task creation with point values
- User enrollment/unenrollment
- Step submissions and approvals/rejections
- Point awarding and deduction
- Point history management
- Data integrity validation

## Test Files

### 1. `points-system.test.js` - Automated Database Tests

A Node.js script that directly tests database operations.

**Setup:**

1. Install dependencies: `npm install`
2. Update the `TEST_CONFIG` object in the file with real IDs from your database:
   ```javascript
   const TEST_CONFIG = {
     adminId: 'your-admin-user-id',
     managerId: 'your-manager-user-id',
     userId: 'your-test-user-id',
     companyId: 'your-company-uuid',
   };
   ```
3. Ensure your `.env.local` has the required environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

**Run:**

```bash
npm run test:points
```

**Tests Covered:**

1. Create Task with Steps - Validates points_reward values
2. Join Task - Cleans up old point history on rejoin
3. Submit Step - Creates pending submission
4. Approve Submission - Awards points correctly
5. Duplicate Prevention - Prevents double point awards
6. Reject Submission - No points on rejection
7. Unjoin Task - Deducts earned points
8. Rejoin Task - Fresh start without old history
9. Delete Task - Complete cleanup cascade
10. Input Validation - NaN prevention for point values
11. Manager Point Updates - increase/decrease/set/reset operations

### 2. `ui-test-scenarios.js` - Manual UI Test Definitions

Defines structured test scenarios for manual browser testing.

**Usage:**
Access the test dashboard at `/test-dashboard` in your browser.

### 3. Test Dashboard Page (`app/test-dashboard/page.jsx`)

Interactive browser-based test runner.

**Features:**

- Database stats overview
- Visual test scenario list
- Step-by-step test tracking
- Pass/Fail marking per step
- Export results as JSON
- Points integrity check

**Access:**

```
http://localhost:3000/test-dashboard
```

## Test Scenarios (12 Total)

| ID    | Name                                           | Priority | Category          |
| ----- | ---------------------------------------------- | -------- | ----------------- |
| TC001 | Create Task with Valid Points                  | HIGH     | Task Management   |
| TC002 | Create Task with Empty Points (NaN Prevention) | HIGH     | Input Validation  |
| TC003 | User Joins a Task                              | HIGH     | Task Enrollment   |
| TC004 | Submit Step for Manager Review                 | HIGH     | Step Submission   |
| TC005 | Manager Approves Submission (Points Awarded)   | CRITICAL | Submission Review |
| TC006 | Verify Duplicate Points Not Awarded            | CRITICAL | Data Integrity    |
| TC007 | Manager Rejects Submission (No Points)         | HIGH     | Submission Review |
| TC008 | User Unjoins Task (Points Deducted)            | CRITICAL | Task Enrollment   |
| TC009 | User Rejoins Task (Fresh Start)                | HIGH     | Task Enrollment   |
| TC010 | Delete Task (All Points Cleaned Up)            | CRITICAL | Task Deletion     |
| TC011 | Manager Direct Point Modifications             | MEDIUM   | Point Management  |
| TC012 | Points Display Consistency                     | MEDIUM   | UI Verification   |

## Expected Behavior Summary

### Point Award Flow

```
User joins task → Submits step → Manager approves → Points added to total + history created
```

### Point Deduction Flow

```
User unjoins task → System finds earned points → Deletes history → Deducts from total
```

### Task Deletion Flow

```
Admin deletes task → Get all steps → Find all point history → Deduct from users →
Delete history → Delete submissions → Delete steps → Delete enrollments → Delete task
```

### Validation Rules

- Empty point values → Default to 0
- Invalid strings → Default to 0
- Negative values → Converted to positive or 0
- NaN results → Default to 0

## Data Integrity Checks

The test dashboard performs these checks:

1. **Points Mismatch**: `SUM(users.total_points)` should equal `SUM(user_point_history.points_earned)`
2. **NaN Steps**: No steps should have `points_reward = NaN` or `null`
3. **Orphaned Records**: No submissions/history for non-existent steps

## Troubleshooting

### Port Already in Use

```bash
# Kill existing Node processes on Windows
npx kill-port 3000
```

### Missing Environment Variables

Ensure `.env.local` contains:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Test Data Cleanup

If tests fail midway, run cleanup manually:

```sql
-- Delete test task and related data
DELETE FROM tasks WHERE title = 'Test Points Task';
DELETE FROM tasks WHERE title = 'Validation Test Task';
```

## Best Practices

1. Run tests on a development/staging database, not production
2. Create dedicated test accounts (admin, manager, user)
3. Document any failed tests with screenshots
4. Re-run integrity checks after bug fixes
5. Export and save test results for regression tracking
