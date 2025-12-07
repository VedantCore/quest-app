'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function Profile({ userId, onStatsUpdate }) {
  const [userInfo, setUserInfo] = useState(null);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const [historyFilter, setHistoryFilter] = useState('all'); // all, thisWeek, thisMonth

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);

      // Fetch user information
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (userError) throw userError;
      setUserInfo(userData);
      setTotalPoints(userData.total_points || 0);

      // Fetch points history
      const { data: historyData, error: historyError } = await supabase
        .from('user_point_history')
        .select(
          `
          history_id,
          points_earned,
          earned_at,
          step:task_steps (
            title,
            task:tasks (
              title
            )
          )
        `
        )
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (historyError) {
        console.error('Error fetching points history:', historyError);
        setPointsHistory([]);
      } else {
        setPointsHistory(historyData || []);

        // Send stats to parent if callback exists
        if (onStatsUpdate) {
          onStatsUpdate({
            totalPoints: userData.total_points || 0,
            completedTasks: historyData?.length || 0,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // alert('Error loading profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600 font-medium">
            Loading profile...
          </div>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-red-200">
        <div className="text-7xl mb-4">❌</div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          Profile Not Found
        </h3>
        <p className="text-gray-600 text-lg">
          Unable to load your profile information.
        </p>
      </div>
    );
  }

  // Filter points history
  const filterHistory = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return pointsHistory.filter((item) => {
      const earnedDate = new Date(item.earned_at);
      if (historyFilter === 'thisWeek') return earnedDate >= weekAgo;
      if (historyFilter === 'thisMonth') return earnedDate >= monthAgo;
      return true;
    });
  };

  const filteredHistory = filterHistory();

  return (
    <div className="space-y-6">
      {/* Enhanced Profile Card */}
      <div className="bg-black rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl shadow-lg ring-4 ring-white ring-opacity-30">
                👤
              </div>
              <div>
                <h2 className="text-4xl font-extrabold mb-1 text-white">
                  {userInfo.name}
                </h2>
                <p className="text-gray-300 text-lg mb-3">{userInfo.email}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm font-bold border border-white/20 text-white">
                    🎭{' '}
                    {userInfo.role.charAt(0).toUpperCase() +
                      userInfo.role.slice(1)}
                  </span>
                  <span className="text-sm text-gray-300 flex items-center gap-1">
                    <span>📅</span>
                    Joined {formatDate(userInfo.created_at).split(',')[0]}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
              <div className="text-7xl font-black mb-2 text-white">
                {totalPoints}
              </div>
              <p className="text-2xl font-bold text-white">Total Points</p>
              <p className="text-sm text-gray-300 mt-1">Keep it up! 🚀</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Points Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-3xl shadow-md">
              💰
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wide">
                Total Earned
              </p>
              <p className="text-4xl font-black text-gray-900">{totalPoints}</p>
            </div>
          </div>
          <div className="text-xs text-gray-500 font-medium mt-2">
            🎯 All-time points earned
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-3xl shadow-md">
              ✅
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wide">
                Completed
              </p>
              <p className="text-4xl font-black text-gray-900">
                {pointsHistory.length}
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-500 font-medium mt-2">
            📝 Total tasks completed
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-3xl shadow-md">
              📊
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wide">
                Average
              </p>
              <p className="text-4xl font-black text-gray-900">
                {pointsHistory.length > 0
                  ? Math.round(totalPoints / pointsHistory.length)
                  : 0}
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-500 font-medium mt-2">
            💎 Points per task
          </div>
        </div>
      </div>

      {/* Points History with Filters */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-3xl">📜</span>
                Points History
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Track your earnings over time
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setHistoryFilter('all')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  historyFilter === 'all'
                    ? 'bg-black text-white shadow-md'
                    : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setHistoryFilter('thisWeek')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  historyFilter === 'thisWeek'
                    ? 'bg-black text-white shadow-md'
                    : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setHistoryFilter('thisMonth')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  historyFilter === 'thisMonth'
                    ? 'bg-black text-white shadow-md'
                    : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                This Month
              </button>
            </div>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-7xl mb-4">📊</div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">
              {historyFilter === 'all'
                ? 'No Points Yet'
                : 'No Points in This Period'}
            </h4>
            <p className="text-gray-600 text-lg">
              {historyFilter === 'all'
                ? 'Complete your assigned tasks to start earning points!'
                : 'Try selecting a different time period or complete more tasks!'}
            </p>
          </div>
        ) : (
          <div>
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-900">
                Showing {filteredHistory.length}{' '}
                {filteredHistory.length === 1 ? 'entry' : 'entries'}
              </p>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {filteredHistory.map((item) => (
                <div
                  key={item.history_id}
                  className="px-6 py-5 hover:bg-gray-50 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-2xl shadow-md flex-shrink-0 text-white">
                        🎯
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 text-lg mb-1">
                          {item.step?.title || 'Task Completed'}
                        </h4>
                        {item.step?.task && (
                          <p className="text-sm text-gray-600 mb-1">
                            📁 From:{' '}
                            <span className="font-semibold text-gray-900">
                              {item.step.task.title}
                            </span>
                          </p>
                        )}
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <span>🕐</span>
                          {formatDate(item.earned_at)}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4 text-right flex-shrink-0">
                      <div className="bg-black text-white px-5 py-3 rounded-xl shadow-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-3xl font-black">
                            +{item.points_earned}
                          </span>
                          <span className="text-sm font-bold">pts</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
