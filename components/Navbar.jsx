'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useRouter } from 'next/navigation';

export default function Navbar({ onOpenLogin, onOpenSignup }) {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  
  // State for dropdowns
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false); // Only for guests
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Refs for click outside detection
  const profileDropdownRef = useRef(null);
  const langDropdownRef = useRef(null);

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
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setIsLangDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileDropdownRef, langDropdownRef]);

  // Common button styles for "smooth & clicky" feel
  const navLinkStyle = "text-sm font-medium text-gray-600 hover:text-[#171717] px-4 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 active:scale-95";
  const primaryButtonStyle = "px-5 py-2.5 text-sm font-semibold text-white bg-[#171717] rounded-xl hover:bg-black transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95";
  const secondaryButtonStyle = "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm active:scale-95";

  return (
    <nav className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-12">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 -ml-2 text-gray-600 hover:text-[#171717] hover:bg-gray-100 rounded-lg transition-all active:scale-95"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Brand Logo */}
          <Link 
            href="/" 
            className="text-xl font-bold tracking-tight text-[#171717] flex items-center gap-2 group active:scale-95 transition-transform duration-200"
          >
            <div className="h-7 w-7 rounded-lg bg-[#171717] shadow-sm group-hover:shadow transition-all"></div>
            Quest
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/#features" className={navLinkStyle}>Features</Link>
            <Link href="/#pricing" className={navLinkStyle}>Pricing</Link>
            <Link href="/#about" className={navLinkStyle}>About</Link>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Guest Language Switcher (Only visible when NOT logged in) */}
          {!user && (
            <div className="relative hidden sm:block" ref={langDropdownRef}>
              <button
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="p-2.5 text-gray-500 hover:text-[#171717] transition-all duration-200 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 active:scale-95"
                aria-label="Select Language"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S12 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S12 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </button>

              {isLangDropdownOpen && (
                <div className="absolute right-0 mt-2 w-32 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black/5 focus:outline-none border border-gray-100 py-1 z-50 animate-in fade-in zoom-in duration-200">
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#171717] transition-colors">English</button>
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#171717] transition-colors">日本語</button>
                </div>
              )}
            </div>
          )}

          {!loading && (
            <>
              {user ? (
                <div className="relative" ref={profileDropdownRef}>
                  <button 
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center gap-2 focus:outline-none transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt="Profile" 
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border-2 border-white shadow-md object-cover ring-1 ring-gray-100" 
                      />
                    ) : (
                      <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-[#171717] text-white flex items-center justify-center text-sm font-medium shadow-md border-2 border-white ring-1 ring-gray-100">
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>

                  {/* Profile Dropdown Menu */}
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-72 origin-top-right rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 focus:outline-none border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      
                      {/* User Info Header */}
                      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                        <p className="text-sm font-bold text-[#171717] truncate">
                          {user.displayName || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate font-medium mb-3">
                          {user.email}
                        </p>
                        {/* Role Badge */}
                        <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-[#171717] border border-gray-200 shadow-sm capitalize">
                          {userRole || 'User'}
                        </span>
                      </div>
                      
                      {/* Links */}
                      <div className="p-2 space-y-1">
                        <Link 
                          href="/user-dashboard?tab=profile" 
                          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#171717] rounded-xl transition-colors group"
                          onClick={() => setIsProfileDropdownOpen(false)}
                        >
                          <span className="p-1.5 bg-gray-100 rounded-lg text-gray-500 group-hover:text-[#171717] group-hover:bg-white transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          </span>
                          My Account
                        </Link>
                        <Link 
                          href="/user-dashboard?tab=tasks" 
                          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#171717] rounded-xl transition-colors group"
                          onClick={() => setIsProfileDropdownOpen(false)}
                        >
                          <span className="p-1.5 bg-gray-100 rounded-lg text-gray-500 group-hover:text-[#171717] group-hover:bg-white transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                          </span>
                          My Quests
                        </Link>
                        
                        {userRole === 'admin' && (
                          <Link href="/admin-dashboard" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#171717] rounded-xl transition-colors group" onClick={() => setIsProfileDropdownOpen(false)}>
                            <span className="p-1.5 bg-gray-100 rounded-lg text-gray-500 group-hover:text-[#171717] group-hover:bg-white transition-colors">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            </span>
                            Admin Dashboard
                          </Link>
                        )}
                        {userRole === 'manager' && (
                          <Link href="/manager-dashboard" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#171717] rounded-xl transition-colors group" onClick={() => setIsProfileDropdownOpen(false)}>
                            <span className="p-1.5 bg-gray-100 rounded-lg text-gray-500 group-hover:text-[#171717] group-hover:bg-white transition-colors">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </span>
                            Manager Dashboard
                          </Link>
                        )}
                      </div>

                      {/* Language Switcher Inside Profile Menu */}
                      <div className="border-t border-gray-100 p-2">
                        <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Language</p>
                        <div className="grid grid-cols-2 gap-2 px-1">
                          <button className="text-center py-2 text-sm font-medium rounded-lg bg-[#171717] text-white shadow-sm transition-all active:scale-95">English</button>
                          <button className="text-center py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 transition-all active:scale-95">日本語</button>
                        </div>
                      </div>

                      {/* Sign Out */}
                      <div className="p-2 border-t border-gray-100 bg-gray-50/30">
                        <button
                          onClick={() => { setIsProfileDropdownOpen(false); handleLogout(); }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors active:scale-95"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                          Sign Out
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
                    Log in
                  </button>
                  <button 
                    onClick={onOpenSignup} 
                    className={primaryButtonStyle}
                  >
                    Get started
                  </button>
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
            <Link href="/#features" className="block px-4 py-3 text-base font-medium text-gray-600 hover:text-[#171717] hover:bg-white rounded-xl transition-colors">Features</Link>
            <Link href="/#pricing" className="block px-4 py-3 text-base font-medium text-gray-600 hover:text-[#171717] hover:bg-white rounded-xl transition-colors">Pricing</Link>
            <Link href="/#about" className="block px-4 py-3 text-base font-medium text-gray-600 hover:text-[#171717] hover:bg-white rounded-xl transition-colors">About</Link>
            {!user && (
              <div className="pt-4 flex flex-col gap-3">
                <button onClick={onOpenLogin} className="w-full text-center px-4 py-3 text-base font-medium text-gray-700 bg-white border border-gray-200 rounded-xl active:scale-95">Log in</button>
                <button onClick={onOpenSignup} className="w-full text-center px-4 py-3 text-base font-bold text-white bg-[#171717] rounded-xl shadow-lg active:scale-95">Get started</button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}