import { supabase } from '@/lib/supabase';
import InteractiveList from './InteractiveList';

export const dynamic = 'force-dynamic';

export default async function ThickDbDemoPage() {
  const TEST_USER_ID = 'user_123';

  // 1. Fetch User Data (or create mock if missing for demo)
  let { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .single();

  if (!user) {
    // Fallback for demo if user doesn't exist in DB yet
    user = { user_id: TEST_USER_ID, name: 'Demo User', total_points: 0 };
  }

  // 2. Fetch Tasks with Steps
  const { data: tasks } = await supabase
    .from('tasks')
    .select(
      `
      *,
      task_steps (*)
    `
    )
    .order('created_at', { ascending: false });

  // 3. Fetch Enrollments
  const { data: enrollments } = await supabase
    .from('task_enrollments')
    .select('*')
    .eq('user_id', TEST_USER_ID);

  // 4. Fetch My Submissions
  const { data: mySubmissions } = await supabase
    .from('step_submissions')
    .select('*')
    .eq('user_id', TEST_USER_ID);

  // 5. Fetch Pending Submissions (Manager View)
  // We join with task_steps and users to show details
  const { data: pendingSubmissions } = await supabase
    .from('step_submissions')
    .select(
      `
      *,
      task_steps (title, points_reward),
      users (name)
    `
    )
    .eq('status', 'PENDING');

  return (
    <InteractiveList
      tasks={tasks || []}
      currentUser={user}
      enrollments={enrollments || []}
      mySubmissions={mySubmissions || []}
      pendingSubmissions={pendingSubmissions || []}
    />
  );
}
