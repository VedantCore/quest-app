'use client';
import { useState } from 'react';
import Navbar from '../components/Navbar';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';

export default function Home() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        onOpenLogin={() => setShowLoginModal(true)}
        onOpenSignup={() => setShowSignupModal(true)}
      />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToSignup={() => {
          setShowLoginModal(false);
          setShowSignupModal(true);
        }}
      />

      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSwitchToLogin={() => {
          setShowSignupModal(false);
          setShowLoginModal(true);
        }}
      />

      {/* Hero Section */}
      <section className="px-6 py-20 text-center md:py-32">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 md:text-6xl">
          Move fast, stay aligned, and <br className="hidden md:block" />
          <span className="text-blue-600">build better together.</span>
        </h1>
        <p className="mt-6 text-lg text-gray-600 md:text-xl max-w-3xl mx-auto">
          The #1 software development tool used by agile teams. Plan, track, and
          release world-class software with the number one project management
          tool for software teams.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <button
            onClick={() => setShowSignupModal(true)}
            className="px-8 py-3 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 md:text-lg"
          >
            Get it free
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
            Features built for every team
          </h2>
          <div className="grid gap-12 md:grid-cols-3">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-blue-100 rounded-full">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Plan</h3>
              <p className="text-gray-600">
                Create user stories and issues, plan sprints, and distribute
                tasks across your software team.
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Track
              </h3>
              <p className="text-gray-600">
                Prioritize and discuss your team’s work in full context with
                complete visibility.
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-purple-100 rounded-full">
                <svg
                  className="w-8 h-8 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Release
              </h3>
              <p className="text-gray-600">
                Ship with confidence and sanity knowing the information you have
                is always up-to-date.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
