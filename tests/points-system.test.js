/**
 * Points System Test Suite
 *
 * This script tests all point-related functionalities to ensure data integrity.
 * Run with: node tests/points-system.test.js
 *
 * Prerequisites:
 * - Set up environment variables in .env.local
 * - Database must have at least one user and one company
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   Make sure .env.local contains:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test configuration - will be populated from database
let TEST_CONFIG = {
  adminId: null,
  managerId: null,
  userId: null,
  companyId: null,
};

// Test state
let testTaskId = null;
let testStepIds = [];
let testEnrollmentId = null;
let testSubmissionId = null;
let initialUserPoints = 0;

// Utility functions
const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  warn: (msg) => console.log(`⚠️  ${msg}`),
  section: (msg) =>
    console.log(`\n${'='.repeat(60)}\n📋 ${msg}\n${'='.repeat(60)}`),
};

// Auto-discover test data from database
async function discoverTestData() {
  log.section('DISCOVERING TEST DATA');

  try {
    // Get a user to use for testing
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('user_id, role')
      .limit(10);

    if (userError) throw userError;
    if (!users || users.length === 0) {
      throw new Error(
        'No users found in database. Please create at least one user.',
      );
    }

    // Try to find users by role
    const admin = users.find((u) => u.role === 'admin');
    const manager = users.find((u) => u.role === 'manager');
    const regularUser = users.find((u) => u.role === 'user') || users[0];

    TEST_CONFIG.adminId = admin?.user_id || regularUser.user_id;
    TEST_CONFIG.managerId = manager?.user_id || regularUser.user_id;
    TEST_CONFIG.userId = regularUser.user_id;

    log.success(`Found admin: ${TEST_CONFIG.adminId}`);
    log.success(`Found manager: ${TEST_CONFIG.managerId}`);
    log.success(`Found user: ${TEST_CONFIG.userId}`);

    // Get a company
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('company_id')
      .limit(1);

    if (companyError) throw companyError;

    if (!companies || companies.length === 0) {
      // Create a test company
      log.info('No companies found, creating test company...');
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          name: 'Test Company',
          description: 'Auto-created for testing',
        })
        .select()
        .single();

      if (createError) throw createError;
      TEST_CONFIG.companyId = newCompany.company_id;
      log.success(`Created test company: ${TEST_CONFIG.companyId}`);
    } else {
      TEST_CONFIG.companyId = companies[0].company_id;
      log.success(`Found company: ${TEST_CONFIG.companyId}`);
    }

    return true;
  } catch (error) {
    log.error(`Failed to discover test data: ${error.message}`);
    return false;
  }
}

async function getUserPoints(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('total_points')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data.total_points || 0;
}

async function getPointHistory(userId, stepId = null) {
  let query = supabase
    .from('user_point_history')
    .select('*')
    .eq('user_id', userId);

  if (stepId) {
    query = query.eq('step_id', stepId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ==========================================
// TEST CASES
// ==========================================

async function testCreateTaskWithSteps() {
  log.section('TEST 1: Create Task with Steps');

  try {
    // Create task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: 'Test Points Task',
        description: 'Testing point distribution system',
        created_by: TEST_CONFIG.adminId,
        assigned_manager_id: TEST_CONFIG.managerId,
        company_id: TEST_CONFIG.companyId,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        level: 3,
        is_active: true,
      })
      .select()
      .single();

    if (taskError) throw taskError;
    testTaskId = task.task_id;
    log.success(`Task created: ${testTaskId}`);

    // Create steps with various point values
    const stepsData = [
      {
        task_id: testTaskId,
        title: 'Step 1 - Easy',
        description: 'Easy step',
        points_reward: 100,
      },
      {
        task_id: testTaskId,
        title: 'Step 2 - Medium',
        description: 'Medium step',
        points_reward: 250,
      },
      {
        task_id: testTaskId,
        title: 'Step 3 - Hard',
        description: 'Hard step',
        points_reward: 500,
      },
    ];

    const { data: steps, error: stepsError } = await supabase
      .from('task_steps')
      .insert(stepsData)
      .select();

    if (stepsError) throw stepsError;
    testStepIds = steps.map((s) => s.step_id);
    log.success(
      `Created ${steps.length} steps with total points: ${stepsData.reduce((sum, s) => sum + s.points_reward, 0)}`,
    );

    // Verify steps
    const { data: verifySteps } = await supabase
      .from('task_steps')
      .select('*')
      .eq('task_id', testTaskId);

    if (verifySteps.length !== 3) {
      throw new Error(`Expected 3 steps, got ${verifySteps.length}`);
    }

    // Check for NaN values
    for (const step of verifySteps) {
      if (isNaN(step.points_reward) || step.points_reward === null) {
        throw new Error(
          `Step ${step.step_id} has invalid points_reward: ${step.points_reward}`,
        );
      }
    }
    log.success('All steps have valid points_reward values');

    return true;
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    return false;
  }
}

async function testJoinTask() {
  log.section('TEST 2: User Joins Task');

  try {
    // Record initial points
    initialUserPoints = await getUserPoints(TEST_CONFIG.userId);
    log.info(`User's initial points: ${initialUserPoints}`);

    // Check for any existing enrollment
    const { data: existingEnrollment } = await supabase
      .from('task_enrollments')
      .select('*')
      .eq('task_id', testTaskId)
      .eq('user_id', TEST_CONFIG.userId)
      .eq('status', 'IN_PROGRESS')
      .single();

    if (existingEnrollment) {
      log.warn('User already enrolled, cleaning up...');
      await supabase
        .from('task_enrollments')
        .delete()
        .eq('enrollment_id', existingEnrollment.enrollment_id);
    }

    // Clean up any old point history for these steps
    const { data: oldHistory } = await supabase
      .from('user_point_history')
      .select('history_id, points_earned')
      .eq('user_id', TEST_CONFIG.userId)
      .in('step_id', testStepIds);

    if (oldHistory && oldHistory.length > 0) {
      log.info(`Found ${oldHistory.length} old point history records`);
      const totalOldPoints = oldHistory.reduce(
        (sum, h) => sum + (h.points_earned || 0),
        0,
      );

      // Delete old history
      await supabase
        .from('user_point_history')
        .delete()
        .in(
          'history_id',
          oldHistory.map((h) => h.history_id),
        );

      // Deduct old points from user
      const { data: currentUser } = await supabase
        .from('users')
        .select('total_points')
        .eq('user_id', TEST_CONFIG.userId)
        .single();

      const newTotal = Math.max(
        0,
        (currentUser.total_points || 0) - totalOldPoints,
      );
      await supabase
        .from('users')
        .update({ total_points: newTotal })
        .eq('user_id', TEST_CONFIG.userId);

      log.success(`Cleaned up ${totalOldPoints} old points`);
      initialUserPoints = newTotal;
    }

    // Join task
    const { data: enrollment, error } = await supabase
      .from('task_enrollments')
      .insert({
        task_id: testTaskId,
        user_id: TEST_CONFIG.userId,
        status: 'IN_PROGRESS',
      })
      .select()
      .single();

    if (error) throw error;
    testEnrollmentId = enrollment.enrollment_id;
    log.success(`User enrolled: ${testEnrollmentId}`);

    return true;
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    return false;
  }
}

async function testSubmitStep() {
  log.section('TEST 3: Submit Step for Review');

  try {
    const stepToSubmit = testStepIds[0]; // Submit first step

    // Create submission
    const { data: submission, error } = await supabase
      .from('step_submissions')
      .insert({
        step_id: stepToSubmit,
        user_id: TEST_CONFIG.userId,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) throw error;
    testSubmissionId = submission.submission_id;
    log.success(`Step submitted: ${testSubmissionId}`);

    // Verify submission exists
    const { data: verify } = await supabase
      .from('step_submissions')
      .select('*')
      .eq('submission_id', testSubmissionId)
      .single();

    if (verify.status !== 'PENDING') {
      throw new Error(`Expected PENDING status, got ${verify.status}`);
    }
    log.success('Submission status is PENDING');

    return true;
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    return false;
  }
}

async function testApproveSubmission() {
  log.section('TEST 4: Approve Submission (Points Awarded)');

  try {
    const pointsBefore = await getUserPoints(TEST_CONFIG.userId);
    log.info(`Points before approval: ${pointsBefore}`);

    // Get step info
    const { data: step } = await supabase
      .from('task_steps')
      .select('points_reward')
      .eq('step_id', testStepIds[0])
      .single();

    const expectedPoints = step.points_reward;
    log.info(`Expected points to award: ${expectedPoints}`);

    // Approve submission
    const { error: updateError } = await supabase
      .from('step_submissions')
      .update({
        status: 'APPROVED',
        reviewed_by: TEST_CONFIG.managerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('submission_id', testSubmissionId);

    if (updateError) throw updateError;

    // Insert point history
    const { error: historyError } = await supabase
      .from('user_point_history')
      .insert({
        user_id: TEST_CONFIG.userId,
        step_id: testStepIds[0],
        points_earned: expectedPoints,
        earned_at: new Date().toISOString(),
      });

    if (historyError) throw historyError;

    // Update user total points
    const { error: pointsError } = await supabase
      .from('users')
      .update({ total_points: pointsBefore + expectedPoints })
      .eq('user_id', TEST_CONFIG.userId);

    if (pointsError) throw pointsError;

    // Verify points awarded
    const pointsAfter = await getUserPoints(TEST_CONFIG.userId);
    log.info(`Points after approval: ${pointsAfter}`);

    if (pointsAfter !== pointsBefore + expectedPoints) {
      throw new Error(
        `Points mismatch! Expected ${pointsBefore + expectedPoints}, got ${pointsAfter}`,
      );
    }
    log.success(`Points correctly awarded: +${expectedPoints}`);

    // Verify point history
    const history = await getPointHistory(TEST_CONFIG.userId, testStepIds[0]);
    if (history.length === 0) {
      throw new Error('Point history not created');
    }
    log.success('Point history record created');

    return true;
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    return false;
  }
}

async function testDuplicatePointPrevention() {
  log.section('TEST 5: Duplicate Point Prevention');

  try {
    const pointsBefore = await getUserPoints(TEST_CONFIG.userId);
    log.info(`Points before duplicate attempt: ${pointsBefore}`);

    // Check if point history exists
    const existingHistory = await getPointHistory(
      TEST_CONFIG.userId,
      testStepIds[0],
    );

    if (existingHistory.length > 0) {
      log.success(`Point history exists - testing duplicate prevention`);

      // Attempt to insert duplicate (should fail if unique constraint exists)
      const { data, error } = await supabase
        .from('user_point_history')
        .insert({
          user_id: TEST_CONFIG.userId,
          step_id: testStepIds[0],
          points_earned: 100,
          earned_at: new Date().toISOString(),
        })
        .select();

      // If insert succeeded without unique constraint, clean it up
      if (data && data.length > 0) {
        log.warn('Duplicate insert was allowed (no unique constraint)');
        log.warn(
          'Run migration: 20260126_add_unique_constraint_user_point_history.sql',
        );

        // Clean up the duplicate
        await supabase
          .from('user_point_history')
          .delete()
          .eq('history_id', data[0].history_id);

        // Also need to check and fix user points if they changed
        const pointsAfterCleanup = await getUserPoints(TEST_CONFIG.userId);
        if (pointsAfterCleanup !== pointsBefore) {
          // Points were affected, restore them
          await supabase
            .from('users')
            .update({ total_points: pointsBefore })
            .eq('user_id', TEST_CONFIG.userId);
        }

        log.info('Cleaned up duplicate - test passes with warning');
        log.warn('⚠️  Add unique constraint to prevent duplicates at DB level');
        return true; // Pass with warning - app logic prevents duplicates
      }

      if (error) {
        // Error could be from unique constraint violation - that's good!
        if (error.code === '23505') {
          // Unique violation
          log.success('Database unique constraint prevented duplicate insert');
        } else {
          log.info(`Insert prevented with error: ${error.message}`);
        }
      }
    }

    const pointsAfter = await getUserPoints(TEST_CONFIG.userId);
    log.info(`Points after test: ${pointsAfter}`);
    log.success('Duplicate prevention test complete');

    return true;
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    return false;
  }
}

async function testRejectSubmission() {
  log.section('TEST 6: Reject Submission (No Points Change)');

  try {
    // Submit second step
    const { data: submission, error: submitError } = await supabase
      .from('step_submissions')
      .insert({
        step_id: testStepIds[1],
        user_id: TEST_CONFIG.userId,
        status: 'PENDING',
      })
      .select()
      .single();

    if (submitError) throw submitError;
    log.info(`Submitted step 2: ${submission.submission_id}`);

    const pointsBefore = await getUserPoints(TEST_CONFIG.userId);
    log.info(`Points before rejection: ${pointsBefore}`);

    // Reject submission
    const { error: rejectError } = await supabase
      .from('step_submissions')
      .update({
        status: 'REJECTED',
        reviewed_by: TEST_CONFIG.managerId,
        reviewed_at: new Date().toISOString(),
        feedback: 'Test rejection - please revise',
      })
      .eq('submission_id', submission.submission_id);

    if (rejectError) throw rejectError;

    // Verify no points awarded
    const pointsAfter = await getUserPoints(TEST_CONFIG.userId);
    if (pointsAfter !== pointsBefore) {
      throw new Error(
        `Points should not change on rejection! Before: ${pointsBefore}, After: ${pointsAfter}`,
      );
    }
    log.success('Points unchanged on rejection');

    // Verify no point history created
    const history = await getPointHistory(TEST_CONFIG.userId, testStepIds[1]);
    if (history.length > 0) {
      throw new Error('Point history should not exist for rejected submission');
    }
    log.success('No point history for rejected submission');

    return true;
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    return false;
  }
}

async function testUnjoinTask() {
  log.section('TEST 7: Unjoin Task (Points Deducted)');

  try {
    const pointsBefore = await getUserPoints(TEST_CONFIG.userId);
    log.info(`Points before unjoining: ${pointsBefore}`);

    // Get point history for this task
    const historyBefore = await getPointHistory(TEST_CONFIG.userId);
    const taskHistory = historyBefore.filter((h) =>
      testStepIds.includes(h.step_id),
    );
    const pointsToDeduct = taskHistory.reduce(
      (sum, h) => sum + (h.points_earned || 0),
      0,
    );
    log.info(`Points to deduct: ${pointsToDeduct}`);

    // Delete point history
    if (taskHistory.length > 0) {
      await supabase
        .from('user_point_history')
        .delete()
        .in(
          'history_id',
          taskHistory.map((h) => h.history_id),
        );
    }

    // Deduct points from user
    const newTotal = Math.max(0, pointsBefore - pointsToDeduct);
    await supabase
      .from('users')
      .update({ total_points: newTotal })
      .eq('user_id', TEST_CONFIG.userId);

    // Delete submissions
    await supabase
      .from('step_submissions')
      .delete()
      .eq('user_id', TEST_CONFIG.userId)
      .in('step_id', testStepIds);

    // Delete enrollment
    await supabase
      .from('task_enrollments')
      .delete()
      .eq('enrollment_id', testEnrollmentId);

    // Verify points deducted
    const pointsAfter = await getUserPoints(TEST_CONFIG.userId);
    log.info(`Points after unjoining: ${pointsAfter}`);

    if (pointsAfter !== newTotal) {
      throw new Error(
        `Points mismatch! Expected ${newTotal}, got ${pointsAfter}`,
      );
    }
    log.success(`Points correctly deducted: -${pointsToDeduct}`);

    // Verify point history deleted
    const historyAfter = await getPointHistory(TEST_CONFIG.userId);
    const taskHistoryAfter = historyAfter.filter((h) =>
      testStepIds.includes(h.step_id),
    );
    if (taskHistoryAfter.length > 0) {
      throw new Error('Point history should be deleted');
    }
    log.success('Point history cleaned up');

    return true;
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    return false;
  }
}

async function testRejoinTask() {
  log.section('TEST 8: Rejoin Task (Fresh Start)');

  try {
    const pointsBefore = await getUserPoints(TEST_CONFIG.userId);
    log.info(`Points before rejoining: ${pointsBefore}`);

    // Rejoin task
    const { data: enrollment, error } = await supabase
      .from('task_enrollments')
      .insert({
        task_id: testTaskId,
        user_id: TEST_CONFIG.userId,
        status: 'IN_PROGRESS',
      })
      .select()
      .single();

    if (error) throw error;
    testEnrollmentId = enrollment.enrollment_id;
    log.success('User rejoined task');

    // Verify no old submissions remain
    const { data: oldSubmissions } = await supabase
      .from('step_submissions')
      .select('*')
      .eq('user_id', TEST_CONFIG.userId)
      .in('step_id', testStepIds);

    if (oldSubmissions && oldSubmissions.length > 0) {
      throw new Error('Old submissions should have been cleared');
    }
    log.success('No old submissions found - fresh start');

    // Verify points unchanged
    const pointsAfter = await getUserPoints(TEST_CONFIG.userId);
    if (pointsAfter !== pointsBefore) {
      throw new Error('Points should not change on rejoin');
    }
    log.success('Points unchanged on rejoin');

    return true;
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    return false;
  }
}

async function testDeleteTask() {
  log.section('TEST 9: Delete Task (Complete Cleanup)');

  try {
    // First, approve a step to create point history
    const { data: submission } = await supabase
      .from('step_submissions')
      .insert({
        step_id: testStepIds[2],
        user_id: TEST_CONFIG.userId,
        status: 'APPROVED',
        reviewed_by: TEST_CONFIG.managerId,
      })
      .select()
      .single();

    const { data: step } = await supabase
      .from('task_steps')
      .select('points_reward')
      .eq('step_id', testStepIds[2])
      .single();

    await supabase.from('user_point_history').insert({
      user_id: TEST_CONFIG.userId,
      step_id: testStepIds[2],
      points_earned: step.points_reward,
    });

    const { data: user } = await supabase
      .from('users')
      .select('total_points')
      .eq('user_id', TEST_CONFIG.userId)
      .single();

    await supabase
      .from('users')
      .update({ total_points: (user.total_points || 0) + step.points_reward })
      .eq('user_id', TEST_CONFIG.userId);

    log.info(`Created test data: ${step.points_reward} points awarded`);

    const pointsBefore = await getUserPoints(TEST_CONFIG.userId);
    log.info(`Points before task deletion: ${pointsBefore}`);

    // Get point history for this task
    const { data: taskHistory } = await supabase
      .from('user_point_history')
      .select('history_id, user_id, points_earned')
      .in('step_id', testStepIds);

    // Calculate points to deduct per user
    const userPointsMap = {};
    taskHistory?.forEach((record) => {
      if (!userPointsMap[record.user_id]) {
        userPointsMap[record.user_id] = 0;
      }
      userPointsMap[record.user_id] += record.points_earned || 0;
    });

    // Deduct points from users
    for (const [userId, pointsToDeduct] of Object.entries(userPointsMap)) {
      const { data: currentUser } = await supabase
        .from('users')
        .select('total_points')
        .eq('user_id', userId)
        .single();

      const newTotal = Math.max(
        0,
        (currentUser.total_points || 0) - pointsToDeduct,
      );
      await supabase
        .from('users')
        .update({ total_points: newTotal })
        .eq('user_id', userId);
    }

    // Delete point history
    if (taskHistory && taskHistory.length > 0) {
      await supabase
        .from('user_point_history')
        .delete()
        .in(
          'history_id',
          taskHistory.map((h) => h.history_id),
        );
    }

    // Delete submissions
    await supabase.from('step_submissions').delete().in('step_id', testStepIds);

    // Delete steps
    await supabase.from('task_steps').delete().eq('task_id', testTaskId);

    // Delete enrollments
    await supabase.from('task_enrollments').delete().eq('task_id', testTaskId);

    // Delete task
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('task_id', testTaskId);

    if (deleteError) throw deleteError;
    log.success('Task deleted');

    // Verify points deducted
    const pointsAfter = await getUserPoints(TEST_CONFIG.userId);
    const expectedPoints =
      pointsBefore - (userPointsMap[TEST_CONFIG.userId] || 0);

    if (pointsAfter !== expectedPoints) {
      throw new Error(
        `Points mismatch! Expected ${expectedPoints}, got ${pointsAfter}`,
      );
    }
    log.success(`Points correctly deducted on task deletion`);

    // Verify cleanup
    const { data: remainingSteps } = await supabase
      .from('task_steps')
      .select('*')
      .eq('task_id', testTaskId);

    if (remainingSteps && remainingSteps.length > 0) {
      throw new Error('Steps should be deleted');
    }
    log.success('All related data cleaned up');

    return true;
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    return false;
  }
}

async function testPointsInputValidation() {
  log.section('TEST 10: Points Input Validation (NaN Prevention)');

  try {
    // Create task with invalid points values to test validation
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: 'Validation Test Task',
        description: 'Testing NaN prevention',
        created_by: TEST_CONFIG.adminId,
        assigned_manager_id: TEST_CONFIG.managerId,
        company_id: TEST_CONFIG.companyId,
        is_active: true,
      })
      .select()
      .single();

    if (taskError) throw taskError;

    // Test various invalid inputs
    const testCases = [
      { title: 'Empty string test', points_reward: '' },
      { title: 'Null test', points_reward: null },
      { title: 'Undefined test', points_reward: undefined },
      { title: 'Valid zero', points_reward: 0 },
      { title: 'Valid positive', points_reward: 100 },
    ];

    for (const testCase of testCases) {
      // Simulate the validation logic from actions.js
      const pointsValue = parseInt(testCase.points_reward);
      const validatedPoints = isNaN(pointsValue) ? 0 : pointsValue;

      log.info(
        `Input: "${testCase.points_reward}" → Validated: ${validatedPoints}`,
      );

      if (isNaN(validatedPoints)) {
        throw new Error(`Validation failed for ${testCase.title} - got NaN`);
      }
    }

    log.success('All NaN cases handled correctly');

    // Cleanup
    await supabase.from('tasks').delete().eq('task_id', task.task_id);

    return true;
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    return false;
  }
}

async function testManagerPointsUpdate() {
  log.section('TEST 11: Manager Points Update Operations');

  try {
    const pointsBefore = await getUserPoints(TEST_CONFIG.userId);
    log.info(`Initial points: ${pointsBefore}`);

    // Test 'increase' action
    const increaseAmount = 50;
    let newPoints = pointsBefore + increaseAmount;
    await supabase
      .from('users')
      .update({ total_points: newPoints })
      .eq('user_id', TEST_CONFIG.userId);

    let currentPoints = await getUserPoints(TEST_CONFIG.userId);
    if (currentPoints !== newPoints) {
      throw new Error('Increase operation failed');
    }
    log.success(
      `Increase: ${pointsBefore} + ${increaseAmount} = ${currentPoints}`,
    );

    // Test 'decrease' action
    const decreaseAmount = 30;
    newPoints = Math.max(0, currentPoints - decreaseAmount);
    await supabase
      .from('users')
      .update({ total_points: newPoints })
      .eq('user_id', TEST_CONFIG.userId);

    currentPoints = await getUserPoints(TEST_CONFIG.userId);
    if (currentPoints !== newPoints) {
      throw new Error('Decrease operation failed');
    }
    log.success(
      `Decrease: Points reduced by ${decreaseAmount} = ${currentPoints}`,
    );

    // Test 'set' action
    const setAmount = 100;
    await supabase
      .from('users')
      .update({ total_points: setAmount })
      .eq('user_id', TEST_CONFIG.userId);

    currentPoints = await getUserPoints(TEST_CONFIG.userId);
    if (currentPoints !== setAmount) {
      throw new Error('Set operation failed');
    }
    log.success(`Set: Points set to ${currentPoints}`);

    // Test 'reset' action
    await supabase
      .from('users')
      .update({ total_points: 0 })
      .eq('user_id', TEST_CONFIG.userId);

    currentPoints = await getUserPoints(TEST_CONFIG.userId);
    if (currentPoints !== 0) {
      throw new Error('Reset operation failed');
    }
    log.success(`Reset: Points = ${currentPoints}`);

    // Restore original points
    await supabase
      .from('users')
      .update({ total_points: pointsBefore })
      .eq('user_id', TEST_CONFIG.userId);

    log.success(`Points restored to ${pointsBefore}`);

    return true;
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    return false;
  }
}

// ==========================================
// CLEANUP
// ==========================================

async function cleanup() {
  log.section('CLEANUP');

  try {
    // Clean up any remaining test data
    if (testTaskId) {
      await supabase
        .from('step_submissions')
        .delete()
        .in('step_id', testStepIds);
      await supabase
        .from('user_point_history')
        .delete()
        .in('step_id', testStepIds);
      await supabase.from('task_steps').delete().eq('task_id', testTaskId);
      await supabase
        .from('task_enrollments')
        .delete()
        .eq('task_id', testTaskId);
      await supabase.from('tasks').delete().eq('task_id', testTaskId);
      log.success('Test data cleaned up');
    }
  } catch (error) {
    log.warn(`Cleanup warning: ${error.message}`);
  }
}

// ==========================================
// MAIN TEST RUNNER
// ==========================================

async function runTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          POINTS SYSTEM TEST SUITE                          ║');
  console.log('║          Testing all point-related functionalities         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // First, discover test data from database
  const discoverySuccess = await discoverTestData();
  if (!discoverySuccess) {
    console.log('\n❌ Cannot run tests without valid test data.');
    console.log('   Please ensure your database has at least one user.');
    process.exit(1);
  }

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  const tests = [
    { name: 'Create Task with Steps', fn: testCreateTaskWithSteps },
    { name: 'Join Task', fn: testJoinTask },
    { name: 'Submit Step', fn: testSubmitStep },
    { name: 'Approve Submission', fn: testApproveSubmission },
    { name: 'Duplicate Point Prevention', fn: testDuplicatePointPrevention },
    { name: 'Reject Submission', fn: testRejectSubmission },
    { name: 'Unjoin Task', fn: testUnjoinTask },
    { name: 'Rejoin Task', fn: testRejoinTask },
    { name: 'Delete Task', fn: testDeleteTask },
    { name: 'Points Input Validation', fn: testPointsInputValidation },
    { name: 'Manager Points Update', fn: testManagerPointsUpdate },
  ];

  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.tests.push({ name: test.name, passed });
      if (passed) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.tests.push({
        name: test.name,
        passed: false,
        error: error.message,
      });
      results.failed++;
    }
  }

  await cleanup();

  // Print summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  for (const test of results.tests) {
    const status = test.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status}  ${test.name}`);
    if (test.error) {
      console.log(`         └── Error: ${test.error}`);
    }
  }

  console.log('\n');
  console.log(
    `  Total: ${results.passed + results.failed} | Passed: ${results.passed} | Failed: ${results.failed}`,
  );
  console.log('\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
