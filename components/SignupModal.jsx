'use client';
import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function SignupModal({ isOpen, onClose, onSwitchToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  if (!isOpen) return null;

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    try {
      console.log('🔵 Starting email/password signup...');
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      console.log('✅ Firebase auth successful:', {
        uid: user.uid,
        email: user.email,
      });

      const userData = {
        user_id: user.uid,
        email: user.email,
        name: name.trim() || email.split('@')[0],
        role: 'user',
        avatar_url: user.photoURL || null,
      };

      console.log('🔵 Attempting Supabase sync with data:', userData);
      const { data, error: supabaseError } = await supabase
        .from('users')
        .upsert(userData, { onConflict: 'user_id' })
        .select();

      if (supabaseError) {
        console.error('❌ Supabase sync error:', {
          message: supabaseError.message,
          details: supabaseError.details,
          hint: supabaseError.hint,
          code: supabaseError.code,
        });
        setError(`Auth successful but sync failed: ${supabaseError.message}`);
      } else {
        console.log('✅ Supabase sync successful:', data);
      }

      onClose();
      router.push('/');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    try {
      console.log('🔵 Starting Google signup...');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log('✅ Firebase auth successful:', {
        uid: user.uid,
        email: user.email,
      });

      const userData = {
        user_id: user.uid,
        email: user.email,
        name: user.displayName || 'User',
        role: 'user',
        avatar_url: user.photoURL || null,
      };

      console.log('🔵 Attempting Supabase sync with data:', userData);
      const { data, error: supabaseError } = await supabase
        .from('users')
        .upsert(userData, { onConflict: 'user_id' })
        .select();

      if (supabaseError) {
        console.error('❌ Supabase sync error:', {
          message: supabaseError.message,
          details: supabaseError.details,
          hint: supabaseError.hint,
          code: supabaseError.code,
        });
        setError(`Auth successful but sync failed: ${supabaseError.message}`);
      } else {
        console.log('✅ Supabase sync successful:', data);
      }

      onClose();
      router.push('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h2 className="text-3xl font-bold text-gray-900 mb-6">Sign up</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignup}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 mb-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              Or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sign up
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
