'use client';
import { useState, useEffect, use } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import {
  validateInviteAction,
  completeSignupWithInviteAction,
} from '@/app/invite-actions';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function InvitePage({ params }) {
  const { code } = use(params);
  const [isValid, setIsValid] = useState(null); // null = loading, true, false
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    checkInvite();
  }, [code]);

  const checkInvite = async () => {
    try {
      const result = await validateInviteAction(code);

      if (result.valid) {
        setIsValid(true);
      } else {
        setIsValid(false);
        if (result.message) toast.error(result.message);
      }
    } catch (err) {
      console.error(err);
      setIsValid(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let user;
      let token;

      try {
        // 1. Try to Create Firebase User
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        user = userCredential.user;
      } catch (authError) {
        if (authError.code === 'auth/email-already-in-use') {
          // If email already exists, try to sign in instead
          console.log('Email already exists, attempting sign in...');
          try {
            const signInCredential = await signInWithEmailAndPassword(
              auth,
              email,
              password
            );
            user = signInCredential.user;
            toast('Email already registered, signing you in...', {
              icon: 'ℹ️',
            });
          } catch (signInError) {
            if (signInError.code === 'auth/wrong-password') {
              toast.error(
                'This email is already registered with a different password. Please contact support or use the correct password.'
              );
              throw signInError;
            } else {
              throw signInError;
            }
          }
        } else {
          throw authError;
        }
      }

      token = await user.getIdToken();

      // 2. Complete Signup (Mark invite used + Create Profile)
      const userData = {
        user_id: user.uid,
        email: user.email,
        name: name.trim() || email.split('@')[0],
      };

      const result = await completeSignupWithInviteAction(
        token,
        code,
        userData
      );

      if (!result.success) {
        console.error('Error completing signup:', result.error);
        toast.error(`Account created but setup failed: ${result.error}`);
        // User is created in Firebase but not in Supabase or invite not marked.
        // This is a partial failure state.
      } else {
        toast.success('Account created successfully!');
        router.push('/');
      }
    } catch (err) {
      console.error(err);
      if (err.code && err.code.startsWith('auth/')) {
        toast.error(err.message);
      } else {
        toast.error('An error occurred during signup. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Invalid Invite
          </h2>
          <p className="text-gray-400">You&apos;re about to join:</p>
          <p className="text-gray-500 mb-6">
            This invite link is invalid, expired, or has already been used.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-8 py-6 bg-indigo-600 text-center">
          <h2 className="text-2xl font-bold text-white">You&apos;re Invited!</h2>
          <p className="text-indigo-100 mt-2">
            Create your account to join Quest
          </p>
        </div>

        <form onSubmit={handleSignup} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
