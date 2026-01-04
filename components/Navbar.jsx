'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useRouter } from 'next/navigation';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar({ onOpenLogin, onOpenSignup }) {
  const { user, userRole, loading } = useAuth();
  const { t } = useLocale();
  const router = useRouter();

  // State for dropdowns
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Refs for click outside detection
  const profileDropdownRef = useRef(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target)
      ) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownRef]);

  // Common button styles for "smooth & clicky" feel
  const navLinkStyle =
    'text-sm font-medium text-gray-600 hover:text-indigo-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 active:scale-95';
  const primaryButtonStyle =
    'px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95';
  const secondaryButtonStyle =
    'px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm active:scale-95';

  return (
    <nav className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-12">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 -ml-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-all active:scale-95"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>

          {/* Brand Logo */}
          <Link
            href={
              user
                ? userRole === 'admin'
                  ? '/admin-dashboard'
                  : userRole === 'manager'
                  ? '/manager-dashboard'
                  : '/user-dashboard'
                : '/'
            }
            className="text-xl font-bold tracking-tight text-indigo-600 flex items-center gap-2 group active:scale-95 transition-transform duration-200"
          >
            <div className="h-7 w-7 rounded-lg bg-indigo-600 shadow-sm group-hover:shadow transition-all"></div>
            {t('nav.quest')}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {!user ? (
              <>
                <Link href="/#features" className={navLinkStyle}>
                  {t('nav.features')}
                </Link>
                <Link href="/#pricing" className={navLinkStyle}>
                  {t('nav.pricing')}
                </Link>
                <Link href="/#about" className={navLinkStyle}>
                  {t('nav.about')}
                </Link>
              </>
            ) : (
              <>
                {userRole === 'user' || !userRole ? (
                  <Link href="/tasks" className={navLinkStyle}>
                    {t('nav.allQuest')}
                  </Link>
                ) : (
                  <Link
                    href={
                      userRole === 'admin'
                        ? '/admin-dashboard'
                        : '/manager-dashboard'
                    }
                    className={navLinkStyle}
                  >
                    {t('nav.dashboard')}
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {!loading && (
            <>
              <LanguageSwitcher />
              {user ? (
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() =>
                      setIsProfileDropdownOpen(!isProfileDropdownOpen)
                    }
                    className="flex items-center gap-2 focus:outline-none transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border-2 border-white shadow-md object-cover ring-1 ring-gray-100"
                      />
                    ) : (
                      <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-medium shadow-md border-2 border-white ring-1 ring-gray-100">
                        {user.displayName
                          ? user.displayName.charAt(0).toUpperCase()
                          : user.email?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>

                  {/* Profile Dropdown Menu */}
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-72 origin-top-right rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 focus:outline-none border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* User Info Header */}
                      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                        <p className="text-sm font-bold text-indigo-600 truncate">
                          {user.displayName || t('userDashboard.explorer')}
                        </p>
                        <p className="text-xs text-gray-500 truncate font-medium mb-3">
                          {user.email}
                        </p>
                        {/* Role Badge */}
                        <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-indigo-600 border border-gray-200 shadow-sm capitalize">
                          {t('common.' + (userRole || 'user'))}
                        </span>
                      </div>

                      {/* Links */}
                      <div className="p-2 space-y-1">
                        <Link
                          href="/user-dashboard?tab=profile"
                          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600 rounded-xl transition-colors group"
                          onClick={() => setIsProfileDropdownOpen(false)}
                        >
                          <span className="p-1.5 bg-gray-100 rounded-lg text-gray-500 group-hover:text-indigo-600 group-hover:bg-white transition-colors">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          </span>
                          {t('nav.myAccount')}
                        </Link>
                        {(userRole === 'user' || !userRole) && (
                          <Link
                            href="/user-dashboard?tab=tasks"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600 rounded-xl transition-colors group"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                            <span className="p-1.5 bg-gray-100 rounded-lg text-gray-500 group-hover:text-indigo-600 group-hover:bg-white transition-colors">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                                />
                              </svg>
                            </span>
                            {t('nav.myQuests')}
                          </Link>
                        )}{' '}
                        {userRole === 'admin' && (
                          <Link
                            href="/admin-dashboard"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600 rounded-xl transition-colors group"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                            <span className="p-1.5 bg-gray-100 rounded-lg text-gray-500 group-hover:text-indigo-600 group-hover:bg-white transition-colors">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                                />
                              </svg>
                            </span>
                            {t('nav.adminDashboard')}
                          </Link>
                        )}
                        {userRole === 'manager' && (
                          <Link
                            href="/manager-dashboard"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600 rounded-xl transition-colors group"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                            <span className="p-1.5 bg-gray-100 rounded-lg text-gray-500 group-hover:text-indigo-600 group-hover:bg-white transition-colors">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </span>
                            {t('nav.managerDashboard')}
                          </Link>
                        )}
                      </div>

                      {/* Sign Out */}
                      <div className="p-2 border-t border-gray-100 bg-gray-50/30">
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            handleLogout();
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors active:scale-95"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                          {t('nav.logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={onOpenLogin}
                    className={secondaryButtonStyle}
                  >
                    {t('login.title')}
                  </button>
                  {/* Public signup disabled - Invite only
                  <button onClick={onOpenSignup} className={primaryButtonStyle}>
                    Get started
                  </button>
                  */}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-4 pt-4 border-t border-gray-100 animate-in slide-in-from-top-2">
          <div className="space-y-2">
            {!user ? (
              <>
                <Link
                  href="/#features"
                  className="block px-4 py-3 text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-white rounded-xl transition-colors"
                >
                  {t('nav.features')}
                </Link>
                <Link
                  href="/#pricing"
                  className="block px-4 py-3 text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-white rounded-xl transition-colors"
                >
                  {t('nav.pricing')}
                </Link>
                <Link
                  href="/#about"
                  className="block px-4 py-3 text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-white rounded-xl transition-colors"
                >
                  {t('nav.about')}
                </Link>
              </>
            ) : (
              <>
                {userRole === 'user' || !userRole ? (
                  <Link
                    href="/tasks"
                    className="block px-4 py-3 text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-white rounded-xl transition-colors"
                  >
                    {t('nav.allQuest')}
                  </Link>
                ) : (
                  <Link
                    href={
                      userRole === 'admin'
                        ? '/admin-dashboard'
                        : '/manager-dashboard'
                    }
                    className="block px-4 py-3 text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-white rounded-xl transition-colors"
                  >
                    {t('nav.dashboard')}
                  </Link>
                )}
              </>
            )}
            {!user && (
              <div className="pt-4 flex flex-col gap-3">
                <button
                  onClick={onOpenLogin}
                  className="w-full text-center px-4 py-3 text-base font-medium text-gray-700 bg-white border border-gray-200 rounded-xl active:scale-95"
                >
                  {t('login.title')}
                </button>
                {/* Public signup disabled - Invite only
                <button
                  onClick={onOpenSignup}
                  className="w-full text-center px-4 py-3 text-base font-bold text-white bg-indigo-600 rounded-xl shadow-lg active:scale-95"
                >
                  Get started
                </button>
                */}
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
