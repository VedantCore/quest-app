'use client';
import { useState } from 'react';
import Navbar from '../components/Navbar';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import Link from 'next/link';

export default function Home() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  return (
    <div className="">
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-black/5">
        <Navbar
          onOpenLogin={() => setShowLoginModal(true)}
          onOpenSignup={() => setShowSignupModal(true)}
        />
      </div>

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
      <section className="px-6 py-16 md:py-36 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-indigo-100 shadow-sm text-indigo-600 text-xs sm:text-sm font-semibold mb-8 sm:mb-10 transition-transform hover:scale-105 cursor-default">
          <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
          Quest is the future of Project Management
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6 sm:mb-8 leading-[1.1] sm:leading-[1.1]">
          Move fast, stay aligned,
          <br className="hidden md:block" />
          <span className="text-indigo-600 block md:inline">
            {' '}
            build better together.
          </span>
        </h1>

        <p className="mt-4 sm:mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl sm:max-w-3xl mx-auto leading-relaxed font-medium">
          The #1 software development tool used by agile teams. Plan, track, and
          release world-class software with the modern project management
          platform built for speed.
        </p>

        <div className="mt-8 sm:mt-12 flex justify-center">
          <button
            onClick={() => setShowSignupModal(true)}
            className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-1"
          >
            Start building your Quests
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-16 sm:py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Everything you need to ship
            </h2>
            <p className="mt-3 text-lg text-slate-600">
              Powerful features for modern teams
            </p>
          </div>

          <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-3">
            {[
              {
                title: 'Plan',
                desc: 'Create user stories and issues, plan sprints, and distribute tasks.',
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                ),
                color: 'text-indigo-600',
                bg: 'bg-indigo-50',
              },
              {
                title: 'Track',
                desc: 'Prioritize and discuss your team’s work in full context with complete visibility.',
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                ),
                color: 'text-indigo-600',
                bg: 'bg-indigo-50',
              },
              {
                title: 'Release',
                desc: 'Ship with confidence and sanity knowing the information you have is always up-to-date.',
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                ),
                color: 'text-violet-600',
                bg: 'bg-violet-50',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-6 sm:p-8 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300"
              >
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 ${feature.bg} ${feature.color} rounded-xl flex items-center justify-center mb-5 sm:mb-6 group-hover:scale-110 transition-transform`}
                >
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-6 py-16 sm:py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Simple, transparent pricing
            </h2>
            <p className="mt-3 text-lg text-slate-600">
              Start for free, scale as you grow
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Starter',
                price: '$0',
                desc: 'For individuals and small teams.',
                features: [
                  'Up to 10 Users',
                  'Unlimited Quests',
                  'Basic Analytics',
                  'Community Support',
                ],
              },
              {
                name: 'Pro',
                price: '$12',
                desc: 'For growing teams that need more.',
                features: [
                  'Unlimited Users',
                  'Advanced Analytics',
                  'Private Projects',
                  'Priority Support',
                ],
                popular: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                desc: 'For large organizations.',
                features: [
                  'SSO & Advanced Security',
                  'Dedicated Success Manager',
                  'Custom Contracts',
                  'SLA Support',
                ],
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`relative p-8 bg-white rounded-2xl border ${
                  plan.popular
                    ? 'border-indigo-600 shadow-xl'
                    : 'border-slate-200 shadow-sm'
                } hover:shadow-lg transition-shadow`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                    POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold text-slate-900">
                  {plan.name}
                </h3>
                <div className="mt-4 mb-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">
                    {plan.price}
                  </span>
                  {plan.price !== 'Custom' && (
                    <span className="text-slate-500">/user/mo</span>
                  )}
                </div>
                <p className="text-slate-600 text-sm mb-6">{plan.desc}</p>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-3 text-sm text-slate-700"
                    >
                      <svg
                        className="w-5 h-5 text-emerald-500 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${
                    plan.popular
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                      : 'bg-slate-50 text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {plan.price === 'Custom' ? 'Contact Sales' : 'Get Started'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="px-6 py-16 sm:py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl font-bold text-slate-900">About Quest</h2>
              <p className="text-slate-600 leading-relaxed text-lg">
                We believe project management shouldn't feel like a chore. Quest
                was born from the frustration of complex, bloated tools that
                slow teams down.
              </p>
              <p className="text-slate-600 leading-relaxed text-lg">
                Our mission is to empower teams to focus on what matters most:{' '}
                <span className="font-semibold text-indigo-600">
                  building great software
                </span>
                . We combine simplicity with power to create a tool that gets
                out of your way.
              </p>
              <div className="pt-4 flex gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-indigo-600">10k+</p>
                  <p className="text-sm text-slate-500">Active Users</p>
                </div>
                <div className="w-px bg-slate-200 h-12"></div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-indigo-600">5M+</p>
                  <p className="text-sm text-slate-500">Tasks Completed</p>
                </div>
              </div>
            </div>
            <div className="flex-1 w-full max-w-md">
              <div className="aspect-square bg-slate-100 rounded-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-violet-100 opacity-50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-32 w-32 bg-white rounded-3xl shadow-xl flex items-center justify-center transform -rotate-6">
                    <div className="h-16 w-16 bg-indigo-600 rounded-xl"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA / Exploration Section */}
      <section className="px-6 py-12 sm:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 sm:p-16 relative overflow-hidden text-center shadow-xl">
            {/* Subtle Light Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute -top-24 -left-24 w-64 sm:w-96 h-64 sm:h-96 bg-indigo-50/50 rounded-full blur-[100px]"></div>
              <div className="absolute bottom-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-violet-50/50 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-6 tracking-tight leading-tight">
                Ready to transform how <br className="hidden sm:block" /> you
                build software?
              </h2>
              <p className="text-slate-600 text-lg sm:text-xl mb-10 leading-relaxed font-medium">
                Join a community of high-performing teams who are shipping
                faster and staying aligned with Quest.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => setShowSignupModal(true)}
                  className="px-8 py-4 text-base font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:-translate-y-1"
                >
                  Start Questing
                </button>
                <Link
                  href="#docs"
                  className="px-8 py-4 text-base font-semibold text-indigo-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm hover:shadow"
                >
                  Explore Documentation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer with Transparent/Light Background */}
      <footer className="border-t border-slate-200 pt-16 pb-12 mt-12 bg-transparent">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
            <div className="col-span-2 lg:col-span-2">
              <Link
                href="/"
                className="text-2xl font-bold tracking-tight text-indigo-600 flex items-center gap-2 mb-6"
              >
                <div className="h-8 w-8 rounded bg-indigo-600"></div>
                Quest
              </Link>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs mb-6">
                The modern standard for project management. Built for speed,
                designed for clarity, and loved by developers.
              </p>
              <div className="flex space-x-4">
                <span className="h-8 w-8 rounded-full bg-white/50 border border-slate-200 hover:bg-white hover:border-slate-300 flex items-center justify-center cursor-pointer transition-all text-slate-600">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </span>
                <span className="h-8 w-8 rounded-full bg-white/50 border border-slate-200 hover:bg-white hover:border-slate-300 flex items-center justify-center cursor-pointer transition-all text-slate-600">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 mb-4">Discover</h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li>
                  <Link
                    href="#"
                    className="hover:text-indigo-600 transition-colors"
                  >
                    Start a Quest
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-indigo-600 transition-colors"
                  >
                    Templates
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-indigo-600 transition-colors"
                  >
                    Integration Gallery
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-indigo-600 transition-colors"
                  >
                    Roadmap
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 mb-4">Resources</h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li>
                  <Link
                    href="#"
                    className="hover:text-indigo-600 transition-colors"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-indigo-600 transition-colors"
                  >
                    API Reference
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-indigo-600 transition-colors"
                  >
                    Community Forum
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-indigo-600 transition-colors"
                  >
                    Help Center
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 mb-4">Company</h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li>
                  <Link
                    href="#"
                    className="hover:text-indigo-600 transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-indigo-600 transition-colors"
                  >
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-indigo-600 transition-colors"
                  >
                    Legal
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-indigo-600 transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 font-medium pt-8 border-t border-slate-200">
            <p>© 2025 Quest App Inc. All rights reserved.</p>
            <div className="flex gap-6 mt-4 sm:mt-0">
              <Link
                href="#"
                className="hover:text-indigo-600 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="hover:text-indigo-600 transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
