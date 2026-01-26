'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import testScenarios from '../../../tests/ui-test-scenarios';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export default function TestDashboardPage() {
  const [activeTest, setActiveTest] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [dbStats, setDbStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDatabaseStats();
  }, []);

  const loadDatabaseStats = async () => {
    try {
      setLoading(true);

      const [users, tasks, steps, submissions, pointHistory] =
        await Promise.all([
          supabase
            .from('users')
            .select('user_id, total_points', { count: 'exact' }),
          supabase.from('tasks').select('task_id', { count: 'exact' }),
          supabase
            .from('task_steps')
            .select('step_id, points_reward', { count: 'exact' }),
          supabase
            .from('step_submissions')
            .select('submission_id, status', { count: 'exact' }),
          supabase
            .from('user_point_history')
            .select('history_id, points_earned', { count: 'exact' }),
        ]);

      // Calculate totals
      const totalUserPoints =
        users.data?.reduce((sum, u) => sum + (u.total_points || 0), 0) || 0;
      const totalHistoryPoints =
        pointHistory.data?.reduce(
          (sum, h) => sum + (h.points_earned || 0),
          0,
        ) || 0;
      const stepsWithNaN =
        steps.data?.filter(
          (s) => isNaN(s.points_reward) || s.points_reward === null,
        ) || [];

      setDbStats({
        users: users.data?.length || 0,
        totalUserPoints,
        tasks: tasks.data?.length || 0,
        steps: steps.data?.length || 0,
        stepsWithNaN: stepsWithNaN.length,
        submissions: {
          total: submissions.data?.length || 0,
          pending:
            submissions.data?.filter((s) => s.status === 'PENDING').length || 0,
          approved:
            submissions.data?.filter((s) => s.status === 'APPROVED').length ||
            0,
          rejected:
            submissions.data?.filter((s) => s.status === 'REJECTED').length ||
            0,
        },
        pointHistory: {
          total: pointHistory.data?.length || 0,
          totalPoints: totalHistoryPoints,
        },
        integrity: {
          pointsMismatch: totalUserPoints !== totalHistoryPoints,
          difference: Math.abs(totalUserPoints - totalHistoryPoints),
        },
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTestResult = (scenarioId, stepIndex, passed) => {
    setTestResults((prev) => ({
      ...prev,
      [scenarioId]: {
        ...prev[scenarioId],
        steps: {
          ...prev[scenarioId]?.steps,
          [stepIndex]: passed,
        },
      },
    }));
  };

  const markScenarioComplete = (scenarioId, passed) => {
    setTestResults((prev) => ({
      ...prev,
      [scenarioId]: {
        ...prev[scenarioId],
        complete: true,
        passed,
        completedAt: new Date().toISOString(),
      },
    }));
  };

  const getScenarioStatus = (scenarioId) => {
    const result = testResults[scenarioId];
    if (!result) return 'not-started';
    if (result.complete) return result.passed ? 'passed' : 'failed';
    if (result.steps && Object.keys(result.steps).length > 0)
      return 'in-progress';
    return 'not-started';
  };

  const filteredScenarios = testScenarios.filter(
    (scenario) =>
      scenario.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scenario.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scenario.id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const sortedScenarios = [...filteredScenarios].sort(
    (a, b) =>
      (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99),
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            🧪 Points System Test Dashboard
          </h1>
          <p className="text-gray-400">
            Manual testing scenarios for verifying point-related functionality
          </p>
        </div>

        {/* Database Stats */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">📊 Database Status</h2>
            <button
              onClick={loadDatabaseStats}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {dbStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <StatCard label="Users" value={dbStats.users} />
              <StatCard
                label="Total User Points"
                value={dbStats.totalUserPoints}
              />
              <StatCard label="Tasks" value={dbStats.tasks} />
              <StatCard label="Steps" value={dbStats.steps} />
              <StatCard
                label="Steps with NaN"
                value={dbStats.stepsWithNaN}
                variant={dbStats.stepsWithNaN > 0 ? 'error' : 'success'}
              />
              <StatCard
                label="Point History Records"
                value={dbStats.pointHistory.total}
              />
              <StatCard
                label="History Total Points"
                value={dbStats.pointHistory.totalPoints}
              />
              <StatCard
                label="Pending Submissions"
                value={dbStats.submissions.pending}
                variant={
                  dbStats.submissions.pending > 0 ? 'warning' : 'default'
                }
              />
              <StatCard
                label="Approved"
                value={dbStats.submissions.approved}
                variant="success"
              />
              <StatCard label="Rejected" value={dbStats.submissions.rejected} />
              <StatCard
                label="Points Integrity"
                value={
                  dbStats.integrity.pointsMismatch
                    ? `Mismatch: ${dbStats.integrity.difference}`
                    : 'OK'
                }
                variant={dbStats.integrity.pointsMismatch ? 'error' : 'success'}
              />
            </div>
          )}
        </div>

        {/* Test Progress Summary */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">📈 Test Progress</h2>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-600"></span>
              <span>
                Not Started:{' '}
                {
                  testScenarios.filter(
                    (s) => getScenarioStatus(s.id) === 'not-started',
                  ).length
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span>
                In Progress:{' '}
                {
                  testScenarios.filter(
                    (s) => getScenarioStatus(s.id) === 'in-progress',
                  ).length
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span>
                Passed:{' '}
                {
                  testScenarios.filter(
                    (s) => getScenarioStatus(s.id) === 'passed',
                  ).length
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span>
                Failed:{' '}
                {
                  testScenarios.filter(
                    (s) => getScenarioStatus(s.id) === 'failed',
                  ).length
                }
              </span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search scenarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Test Scenarios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scenario List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">📋 Test Scenarios</h2>
            {sortedScenarios.map((scenario) => (
              <div
                key={scenario.id}
                onClick={() => setActiveTest(scenario)}
                className={`bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-750 transition-colors border-l-4 ${
                  activeTest?.id === scenario.id
                    ? 'border-blue-500'
                    : getScenarioStatus(scenario.id) === 'passed'
                      ? 'border-green-500'
                      : getScenarioStatus(scenario.id) === 'failed'
                        ? 'border-red-500'
                        : getScenarioStatus(scenario.id) === 'in-progress'
                          ? 'border-yellow-500'
                          : 'border-gray-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">
                        {scenario.id}
                      </span>
                      <PriorityBadge priority={scenario.priority} />
                    </div>
                    <h3 className="font-semibold">{scenario.name}</h3>
                    <p className="text-sm text-gray-400">{scenario.category}</p>
                  </div>
                  <StatusBadge status={getScenarioStatus(scenario.id)} />
                </div>
              </div>
            ))}
          </div>

          {/* Active Test Detail */}
          <div className="lg:sticky lg:top-8 h-fit">
            {activeTest ? (
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{activeTest.name}</h2>
                    <p className="text-gray-400">
                      {activeTest.id} • {activeTest.category}
                    </p>
                  </div>
                  <PriorityBadge priority={activeTest.priority} />
                </div>

                {/* Preconditions */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2 text-yellow-400">
                    ⚠️ Preconditions
                  </h3>
                  <ul className="space-y-1">
                    {activeTest.preconditions.map((pre, i) => (
                      <li
                        key={i}
                        className="text-gray-300 text-sm flex items-center gap-2"
                      >
                        <span>•</span> {pre}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Steps */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">📝 Steps</h3>
                  <div className="space-y-3">
                    {activeTest.steps.map((step, i) => (
                      <div key={i} className="bg-gray-700 rounded-lg p-3">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <p className="font-medium">
                              {i + 1}. {step.action}
                            </p>
                            <p className="text-sm text-green-400 mt-1">
                              ✓ Expected: {step.expected}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                updateTestResult(activeTest.id, i, true)
                              }
                              className={`p-2 rounded ${
                                testResults[activeTest.id]?.steps?.[i] === true
                                  ? 'bg-green-600'
                                  : 'bg-gray-600 hover:bg-green-600'
                              }`}
                            >
                              ✓
                            </button>
                            <button
                              onClick={() =>
                                updateTestResult(activeTest.id, i, false)
                              }
                              className={`p-2 rounded ${
                                testResults[activeTest.id]?.steps?.[i] === false
                                  ? 'bg-red-600'
                                  : 'bg-gray-600 hover:bg-red-600'
                              }`}
                            >
                              ✗
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expected Result */}
                <div className="mb-6 p-4 bg-blue-900/30 rounded-lg border border-blue-700">
                  <h3 className="font-semibold mb-2 text-blue-400">
                    🎯 Expected Result
                  </h3>
                  <p>{activeTest.expectedResult}</p>
                </div>

                {/* Cleanup */}
                <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
                  <h3 className="font-semibold mb-2">🧹 Cleanup</h3>
                  <p className="text-gray-300">{activeTest.cleanup}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    onClick={() => markScenarioComplete(activeTest.id, true)}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold"
                  >
                    ✓ Mark as Passed
                  </button>
                  <button
                    onClick={() => markScenarioComplete(activeTest.id, false)}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
                  >
                    ✗ Mark as Failed
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
                <p>Select a test scenario from the list to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Export Results */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => {
              const report = {
                generatedAt: new Date().toISOString(),
                results: testResults,
                summary: {
                  total: testScenarios.length,
                  passed: testScenarios.filter(
                    (s) => getScenarioStatus(s.id) === 'passed',
                  ).length,
                  failed: testScenarios.filter(
                    (s) => getScenarioStatus(s.id) === 'failed',
                  ).length,
                  notStarted: testScenarios.filter(
                    (s) => getScenarioStatus(s.id) === 'not-started',
                  ).length,
                },
              };
              const blob = new Blob([JSON.stringify(report, null, 2)], {
                type: 'application/json',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `test-results-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
            }}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold"
          >
            📥 Export Results (JSON)
          </button>
          <button
            onClick={() => {
              setTestResults({});
              setActiveTest(null);
            }}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold"
          >
            🔄 Reset All Results
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ label, value, variant = 'default' }) {
  const variants = {
    default: 'bg-gray-700',
    success: 'bg-green-900/50 text-green-400',
    warning: 'bg-yellow-900/50 text-yellow-400',
    error: 'bg-red-900/50 text-red-400',
  };

  return (
    <div className={`rounded-lg p-3 ${variants[variant]}`}>
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const colors = {
    CRITICAL: 'bg-red-600',
    HIGH: 'bg-orange-600',
    MEDIUM: 'bg-yellow-600',
    LOW: 'bg-gray-600',
  };

  return (
    <span className={`text-xs px-2 py-1 rounded ${colors[priority]}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }) {
  const config = {
    'not-started': { text: 'Not Started', bg: 'bg-gray-600' },
    'in-progress': { text: 'In Progress', bg: 'bg-yellow-600' },
    'passed': { text: 'Passed', bg: 'bg-green-600' },
    'failed': { text: 'Failed', bg: 'bg-red-600' },
  };

  const { text, bg } = config[status] || config['not-started'];

  return <span className={`text-xs px-2 py-1 rounded ${bg}`}>{text}</span>;
}
