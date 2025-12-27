'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Stats({ companyId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGraph, setActiveGraph] = useState('leaderboard');
  const [stats, setStats] = useState({
    totalPoints: 0,
    avgPoints: 0,
    totalUsers: 0,
    activeUsers: 0,
  });

  useEffect(() => {
    fetchStats();
  }, [companyId]);

  const fetchStats = async () => {
    try {
      let data, error;

      if (companyId) {
        // Fetch users belonging to this company for stats via join
        const result = await supabase
          .from('user_companies')
          .select(`
            user_id,
            users!user_companies_user_id_fkey (
              name,
              total_points,
              role,
              created_at
            )
          `)
          .eq('company_id', companyId);
        
        if (result.error) throw result.error;
        data = result.data.map(item => item.users).filter(u => u);
      } else {
        const result = await supabase
          .from('users')
          .select('name, total_points, role, created_at')
          .order('total_points', { ascending: false });
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      const allUsers = data || [];
      // Filter for stats calculation (usually we care about 'user' role for points)
      const standardUsers = allUsers.filter((u) => u.role === 'user');

      const totalPoints = standardUsers.reduce(
        (sum, user) => sum + (user.total_points || 0),
        0
      );
      const activeUsers = standardUsers.filter(
        (u) => u.total_points > 0
      ).length;

      setUsers(allUsers);
      setStats({
        totalPoints,
        avgPoints:
          standardUsers.length > 0
            ? Math.round(totalPoints / standardUsers.length)
            : 0,
        totalUsers: allUsers.length,
        activeUsers,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">
        Loading statistics...
      </div>
    );
  }

  // --- Graph Data Preparation ---

  // 1. Leaderboard (All Users)
  const leaderboardData = users
    .filter((u) => u.role === 'user')
    .sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
  const maxLeaderboardPoints = Math.max(
    ...leaderboardData.map((u) => u.total_points || 0),
    100
  );

  // 2. Points Distribution (Histogram)
  const distributionBuckets = {
    '0': 0,
    '1-100': 0,
    '101-500': 0,
    '501-1000': 0,
    '1000+': 0,
  };
  users
    .filter((u) => u.role === 'user')
    .forEach((u) => {
      const p = u.total_points || 0;
      if (p === 0) distributionBuckets['0']++;
      else if (p <= 100) distributionBuckets['1-100']++;
      else if (p <= 500) distributionBuckets['101-500']++;
      else if (p <= 1000) distributionBuckets['501-1000']++;
      else distributionBuckets['1000+']++;
    });
  const maxDistribution = Math.max(...Object.values(distributionBuckets), 1);

  // 3. User Growth (Cumulative)
  const growthData = users
    .map((u) => new Date(u.created_at).toISOString().split('T')[0])
    .sort()
    .reduce((acc, date) => {
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

  let cumulative = 0;
  const growthPoints = Object.entries(growthData).map(([date, count]) => {
    cumulative += count;
    return { date, count: cumulative };
  });

  // 4. Role Distribution
  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});
  const totalRoles = users.length;

  // 5. Active vs Inactive (Users only)
  const activeCount = users.filter(
    (u) => u.role === 'user' && u.total_points > 0
  ).length;
  const inactiveCount = users.filter(
    (u) => u.role === 'user' && (!u.total_points || u.total_points === 0)
  ).length;
  const totalUserRole = activeCount + inactiveCount;

  // --- Helper Components ---

  const GraphSelector = () => (
    <div className="flex flex-wrap gap-2 mb-6">
      {[
        { id: 'leaderboard', label: 'Leaderboard' },
        { id: 'distribution', label: 'Points Dist.' },
        { id: 'growth', label: 'User Growth' },
        { id: 'roles', label: 'Roles' },
        { id: 'activity', label: 'Activity' },
      ].map((g) => (
        <button
          key={g.id}
          onClick={() => setActiveGraph(g.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeGraph === g.id
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {g.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Total Points
          </h3>
          <p className="text-3xl font-bold text-indigo-600 mt-2">
            {stats.totalPoints.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Average Points
          </h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {stats.avgPoints.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Total Users
          </h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {stats.totalUsers}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Active Users
          </h3>
          <p className="text-3xl font-bold text-emerald-600 mt-2">
            {stats.activeUsers}
          </p>
          <p className="text-xs text-gray-400 mt-1">Users with points &gt; 0</p>
        </div>
      </div>

      {/* Graph Section */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[500px]">
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">
              {activeGraph === 'leaderboard' && 'All Users Leaderboard'}
              {activeGraph === 'distribution' && 'Points Distribution'}
              {activeGraph === 'growth' && 'User Growth Over Time'}
              {activeGraph === 'roles' && 'User Role Distribution'}
              {activeGraph === 'activity' && 'Active vs Inactive Users'}
            </h3>
          </div>

          <GraphSelector />

          <div className="flex-1 overflow-hidden">
            {/* 1. Leaderboard */}
            {activeGraph === 'leaderboard' && (
              <div className="h-[400px] overflow-y-auto pr-2 space-y-3">
                {leaderboardData.map((user, index) => {
                  const percentage =
                    ((user.total_points || 0) / maxLeaderboardPoints) * 100;
                  return (
                    <div key={index} className="relative">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700 w-48 truncate">
                          {index + 1}. {user.name || 'Anonymous'}
                        </span>
                        <span className="font-bold text-indigo-600">
                          {user.total_points || 0} pts
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-3 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
                {leaderboardData.length === 0 && (
                  <p className="text-center text-gray-500 mt-10">
                    No users found.
                  </p>
                )}
              </div>
            )}

            {/* 2. Distribution */}
            {activeGraph === 'distribution' && (
              <div className="h-[400px] flex items-end justify-around gap-4 pb-8 pt-4">
                {Object.entries(distributionBuckets).map(([range, count]) => {
                  const height = (count / maxDistribution) * 100;
                  return (
                    <div
                      key={range}
                      className="flex flex-col items-center flex-1 h-full justify-end group"
                    >
                      <div
                        className="relative w-full max-w-[60px] bg-indigo-100 rounded-t-lg hover:bg-indigo-200 transition-colors flex items-end justify-center"
                        style={{ height: `${height}%` }}
                      >
                        <span className="mb-2 font-bold text-indigo-700">
                          {count}
                        </span>
                      </div>
                      <span className="mt-2 text-xs font-medium text-gray-600">
                        {range}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. Growth (Simple SVG Line Chart) */}
            {activeGraph === 'growth' && (
              <div className="h-[400px] w-full relative pt-4">
                {growthPoints.length > 1 ? (
                  <svg
                    viewBox="0 0 100 50"
                    className="w-full h-full"
                    preserveAspectRatio="none"
                  >
                    <polyline
                      fill="none"
                      stroke="#4F46E5"
                      strokeWidth="0.5"
                      points={growthPoints
                        .map((p, i) => {
                          const x = (i / (growthPoints.length - 1)) * 100;
                          const y = 50 - (p.count / stats.totalUsers) * 50;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                    {/* Area under curve */}
                    <polygon
                      fill="rgba(79, 70, 229, 0.1)"
                      stroke="none"
                      points={`0,50 ${growthPoints
                        .map((p, i) => {
                          const x = (i / (growthPoints.length - 1)) * 100;
                          const y = 50 - (p.count / stats.totalUsers) * 50;
                          return `${x},${y}`;
                        })
                        .join(' ')} 100,50`}
                    />
                  </svg>
                ) : (
                  <p className="text-center text-gray-500 mt-20">
                    Not enough data for growth chart.
                  </p>
                )}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-400 px-2">
                  <span>{growthPoints[0]?.date}</span>
                  <span>{growthPoints[growthPoints.length - 1]?.date}</span>
                </div>
              </div>
            )}

            {/* 4. Roles (Simple CSS Pie/Bar representation) */}
            {activeGraph === 'roles' && (
              <div className="h-[400px] flex flex-col justify-center items-center gap-6">
                {Object.entries(roleCounts).map(([role, count]) => {
                  const percentage = ((count / totalRoles) * 100).toFixed(1);
                  return (
                    <div key={role} className="w-full max-w-md">
                      <div className="flex justify-between mb-1">
                        <span className="capitalize font-medium text-gray-700">
                          {role}
                        </span>
                        <span className="text-gray-500">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-4">
                        <div
                          className={`h-4 rounded-full ${
                            role === 'admin'
                              ? 'bg-purple-500'
                              : role === 'manager'
                              ? 'bg-blue-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 5. Activity */}
            {activeGraph === 'activity' && (
              <div className="h-[400px] flex items-center justify-center gap-12">
                {/* Simple Donut Chart using conic-gradient */}
                <div
                  className="w-64 h-64 rounded-full relative"
                  style={{
                    background: `conic-gradient(#10B981 0% ${
                      (activeCount / totalUserRole) * 100
                    }%, #E5E7EB ${(activeCount / totalUserRole) * 100}% 100%)`,
                  }}
                >
                  <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center flex-col">
                    <span className="text-3xl font-bold text-gray-800">
                      {totalUserRole}
                    </span>
                    <span className="text-sm text-gray-500">Total Users</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                    <div>
                      <p className="font-medium text-gray-900">Active</p>
                      <p className="text-sm text-gray-500">
                        {activeCount} users (
                        {((activeCount / totalUserRole) * 100).toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <div>
                      <p className="font-medium text-gray-900">Inactive</p>
                      <p className="text-sm text-gray-500">
                        {inactiveCount} users (
                        {((inactiveCount / totalUserRole) * 100).toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
