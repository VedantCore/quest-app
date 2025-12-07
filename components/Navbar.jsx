'use client';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

export default function Navbar({ onOpenLogin, onOpenSignup }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="flex items-center justify-between p-6 bg-white border-b border-gray-100 relative z-50">
      <div className="flex items-center space-x-8">
        <Link href="/" className="text-2xl font-bold text-gray-900 tracking-tight">
          Quest
        </Link>
        <div className="hidden md:flex space-x-6">
          {['Features', 'Pricing', 'About'].map((item) => (
            <Link 
              key={item}
              href={`#${item.toLowerCase()}`} 
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {item}
            </Link>
          ))}
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        {!loading && (
          <>
            {user ? (
              <div className="relative" ref={dropdownRef}>
                {/* Profile Icon Button */}
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 overflow-hidden"
                >
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-72 bg-white rounded-xl shadow-xl border border-gray-100 ring-1 ring-black ring-opacity-5 origin-top-right">
                    
                    {/* User Info Header */}
                    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {user.displayName || 'Quest User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {user.email}
                      </p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <Link 
                        href="/account" 
                        className="flex items-center px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <span className="mr-3 text-gray-400">👤</span>
                        My Account
                      </Link>
                      <Link 
                        href="/my-quests" 
                        className="flex items-center px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <span className="mr-3 text-gray-400">⚔️</span>
                        My Quests
                      </Link>
                    </div>

                    {/* Sign Out */}
                    <div className="border-t border-gray-100 py-2">
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center px-5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={onOpenLogin}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Log in
                </button>
                <button
                  onClick={onOpenSignup}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
                >
                  Get started
                </button>
              </>
            )}
          </>
        )}
      </div>
    </nav>
  );
}