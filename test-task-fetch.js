// Quick test to check if tasks can be fetched from Supabase
// Run this with: node test-task-fetch.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables manually
const envContent = readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach((line) => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key exists:', !!supabaseAnonKey);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
  console.log('\n=== Testing Task Fetch ===\n');

  // Test 1: Fetch all tasks
  console.log('1. Fetching all tasks...');
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*');

  if (tasksError) {
    console.error('❌ Error fetching tasks:', tasksError);
  } else {
    console.log('✅ Tasks found:', tasks?.length || 0);
    console.log('Tasks:', JSON.stringify(tasks, null, 2));
  }

  // Test 2: Fetch tasks with subtasks
  console.log('\n2. Fetching tasks with subtasks...');
  const { data: tasksWithSubs, error: subsError } = await supabase
    .from('tasks')
    .select(
      `
      *,
      subtasks (
        subtask_id,
        task_id,
        title,
        points,
        is_completed,
        created_at
      )
    `
    )
    .order('created_at', { ascending: false });

  if (subsError) {
    console.error('❌ Error fetching tasks with subtasks:', subsError);
  } else {
    console.log('✅ Tasks with subtasks found:', tasksWithSubs?.length || 0);
    console.log('Data:', JSON.stringify(tasksWithSubs, null, 2));
  }

  // Test 3: Check RLS policies
  console.log(
    '\n3. Testing without auth (should work with permissive policies)...'
  );
  const { data: noAuthData, error: noAuthError } = await supabase
    .from('tasks')
    .select('task_id, heading');

  if (noAuthError) {
    console.error('❌ Error (this means RLS is blocking):', noAuthError);
    console.log(
      '\n⚠️  You need to run fix-rls-for-firebase-auth.sql in Supabase!'
    );
  } else {
    console.log(
      '✅ RLS policies are permissive:',
      noAuthData?.length || 0,
      'tasks visible'
    );
  }

  // Test 4: Check users table
  console.log('\n4. Checking users table...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('user_id, name, email, role');

  if (usersError) {
    console.error('❌ Error fetching users:', usersError);
  } else {
    console.log('✅ Users found:', users?.length || 0);
    console.log(
      'Roles:',
      users?.map((u) => `${u.name} (${u.role})`)
    );
  }
}

testFetch()
  .then(() => {
    console.log('\n=== Test Complete ===\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
