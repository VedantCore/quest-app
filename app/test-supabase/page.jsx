'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TestSupabase() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult('Testing connection...\n');

    try {
      // Test 1: Check connection
      setResult((prev) => prev + '\n📡 Testing connection to Supabase...\n');
      const { data: selectData, error: selectError } = await supabase
        .from('users')
        .select('*')
        .limit(5);

      if (selectError) {
        setResult(
          (prev) =>
            prev +
            `❌ Connection error: ${selectError.message}\n` +
            `Details: ${JSON.stringify(selectError, null, 2)}\n`
        );
      } else {
        setResult(
          (prev) =>
            prev +
            `✅ Connection successful!\n` +
            `Found ${selectData?.length || 0} users\n` +
            `Data: ${JSON.stringify(selectData, null, 2)}\n`
        );
      }

      // Test 2: Try insert
      setResult((prev) => prev + '\n📝 Testing insert operation...\n');
      const testUser = {
        user_id: 'test-' + Date.now(),
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        avatar_url: null,
      };

      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .upsert(testUser, { onConflict: 'user_id' })
        .select();

      if (insertError) {
        setResult(
          (prev) =>
            prev +
            `❌ Insert error: ${insertError.message}\n` +
            `Code: ${insertError.code}\n` +
            `Details: ${JSON.stringify(insertError, null, 2)}\n`
        );
      } else {
        setResult(
          (prev) =>
            prev +
            `✅ Insert successful!\n` +
            `Data: ${JSON.stringify(insertData, null, 2)}\n`
        );

        // Clean up
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('user_id', testUser.user_id);

        if (!deleteError) {
          setResult((prev) => prev + '✅ Cleanup successful\n');
        }
      }

      // Test 3: Check table structure
      setResult((prev) => prev + '\n🔍 Checking table info...\n');
      const { data: tableData, error: tableError } = await supabase
        .from('users')
        .select('*')
        .limit(0);

      setResult(
        (prev) =>
          prev + `Table query result: ${tableError ? 'Error' : 'Success'}\n`
      );
    } catch (err) {
      setResult(
        (prev) => prev + `\n❌ Exception: ${err.message}\n${err.stack}\n`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Supabase Connection Test</h1>

      <div className="mb-4">
        <button
          onClick={testConnection}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Testing...' : 'Run Test'}
        </button>
      </div>

      {result && (
        <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm whitespace-pre-wrap overflow-auto max-h-[600px]">
          {result}
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h2 className="font-bold mb-2">Environment Variables Check:</h2>
        <ul className="space-y-1 text-sm">
          <li>
            SUPABASE_URL:{' '}
            {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
          </li>
          <li>
            SUPABASE_ANON_KEY:{' '}
            {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
              ? '✅ Set'
              : '❌ Missing'}
          </li>
        </ul>
      </div>
    </div>
  );
}
