'use client';
import { useState, useEffect, use } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth, googleProvider } from '../../../lib/firebase';
import {
  validateInviteAction,
  completeSignupWithInviteAction,
} from '@/app/invite-actions';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useLocale } from '@/context/LocaleContext';

export default function InvitePage({ params }) {
  const { code } = use(params);
  const [isValid, setIsValid] = useState(null); // null = loading, true, false
  const [loading, setLoading] = useState(true);

  const { t } = useLocale();

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
            toast(t('invite.emailRegistered'), {
              icon: 'ℹ️',
            });
          } catch (signInError) {
            if (signInError.code === 'auth/wrong-password') {
              toast.error(t('invite.wrongPassword'));
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
        toast.error(t('invite.setupFailed', { error: result.error }));
        // User is created in Firebase but not in Supabase or invite not marked.
        // This is a partial failure state.
      } else {
        toast.success(t('invite.success'));
        router.push('/');
      }
    } catch (err) {
      console.error(err);
      if (err.code && err.code.startsWith('auth/')) {
        toast.error(err.message);
      } else {
        toast.error(t('invite.errorGeneric'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsSubmitting(true);

    try {
      console.log('🔵 Starting Google signup with invite...');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log('✅ Firebase auth successful:', {
        uid: user.uid,
        email: user.email,
      });

      const token = await user.getIdToken();

      // Complete Signup (Mark invite used + Create Profile)
      const userData = {
        user_id: user.uid,
        email: user.email,
        name: user.displayName || 'User',
        avatar_url: user.photoURL || null,
      };

      const signupResult = await completeSignupWithInviteAction(
        token,
        code,
        userData
      );

      if (!signupResult.success) {
        console.error('Error completing signup:', signupResult.error);
        toast.error(t('invite.setupFailed', { error: signupResult.error }));
        // If signup failed, sign out the user
        await auth.signOut();
      } else {
        toast.success(t('invite.success'));
        router.push('/');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || t('invite.errorGeneric'));
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
            {t('invite.invalidTitle')}
          </h2>
          <p className="text-gray-400">{t('invite.joining')}</p>
          <p className="text-gray-500 mb-6">{t('invite.invalidText')}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            {t('invite.goHome')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-8 py-6 bg-indigo-600 text-center">
          <h2 className="text-2xl font-bold text-white">{t('invite.title')}</h2>
          <p className="text-indigo-100 mt-2">{t('invite.subtitle')}</p>
        </div>

        <form onSubmit={handleSignup} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('invite.fullName')}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder={t('invite.placeholderName')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('invite.emailAddress')}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder={t('invite.placeholderEmail')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('invite.password')}
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
            {isSubmitting
              ? t('invite.creatingAccount')
              : t('invite.createAccount')}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                {t('signup.orContinueWith')}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow active:scale-95"
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
            {t('signup.continueWithGoogle')}
          </button>
        </form>
      </div>
    </div>
  );
}
