// Test Supabase connection
import { supabase } from './lib/supabase';

async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');

    // Test connection
    const { data, error } = await supabase.from('users').select('count');

    if (error) {
      console.error('❌ Supabase connection error:', error);
      return;
    }

    console.log('✅ Supabase connection successful!');
    console.log('Data:', data);

    // Test insert with a dummy user
    const testUser = {
      user_id: 'test-' + Date.now(),
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      avatar_url: null,
    };

    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert(testUser)
      .select();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      console.error('Error details:', JSON.stringify(insertError, null, 2));
    } else {
      console.log('✅ Insert successful!');
      console.log('Inserted data:', insertData);

      // Clean up - delete test user
      await supabase.from('users').delete().eq('user_id', testUser.user_id);
      console.log('✅ Test user cleaned up');
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testSupabaseConnection();
