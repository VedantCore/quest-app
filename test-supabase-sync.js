import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseAnonKey);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test 1: Check if we can connect
async function testConnection() {
  try {
    const { data, error } = await supabase.from('users').select('*').limit(1);
    if (error) {
      console.error('❌ Connection error:', error);
      return false;
    }
    console.log('✅ Connection successful');
    console.log('Sample data:', data);
    return true;
  } catch (err) {
    console.error('❌ Exception:', err);
    return false;
  }
}

// Test 2: Try to insert a test user
async function testInsert() {
  const testUser = {
    user_id: 'test-' + Date.now(),
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    avatar_url: null,
  };

  try {
    const { data, error } = await supabase.from('users').upsert(testUser, {
      onConflict: 'user_id',
    });

    if (error) {
      console.error('❌ Insert error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log('✅ Insert successful');
    console.log('Inserted data:', data);

    // Clean up
    await supabase.from('users').delete().eq('user_id', testUser.user_id);
    console.log('✅ Cleanup successful');
    return true;
  } catch (err) {
    console.error('❌ Exception during insert:', err);
    return false;
  }
}

// Run tests
(async () => {
  console.log('\n--- Test 1: Connection ---');
  await testConnection();

  console.log('\n--- Test 2: Insert ---');
  await testInsert();
})();
