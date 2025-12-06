'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function Profile({ userId }) {
  const [userInfo, setUserInfo] = useState(null);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);

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

      // Fetch points history
      const { data: historyData, error: historyError } = await supabase
        .from('point_history')
        .select(
          `
          history_id,
          points_earned,
          earned_at,
          subtasks (
            subtask_id,
            title,
            tasks (
              task_id,
              heading
            )
          )
        `
        )
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (historyError) {
        console.error('Error fetching points history:', historyError);
        // Don't throw, just set empty array
        setPointsHistory([]);
      } else {
        setPointsHistory(historyData || []);

        // Calculate total points
        const total =
          historyData?.reduce(
            (sum, item) => sum + (item.points_earned || 0),
            0
          ) || 0;
        setTotalPoints(total);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      alert('Error loading profile: ' + error.message);
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
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-6xl mb-4">❌</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Profile Not Found
        </h3>
        <p className="text-gray-600">
          Unable to load your profile information.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl">
                👤
              </div>
              <div>
                <h2 className="text-3xl font-bold">{userInfo.name}</h2>
                <p className="text-blue-100">{userInfo.email}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm font-medium">
                {userInfo.role.charAt(0).toUpperCase() + userInfo.role.slice(1)}
              </span>
              <span className="text-sm text-blue-100">
                Joined {formatDate(userInfo.created_at)}
              </span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-6xl font-bold">{totalPoints}</div>
            <p className="text-xl text-blue-100 mt-2">Total Points</p>
          </div>
        </div>
      </div>

      {/* Points Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Earned</p>
              <p className="text-3xl font-bold text-gray-900">{totalPoints}</p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Completed Tasks
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {pointsHistory.length}
              </p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Average Points
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {pointsHistory.length > 0
                  ? Math.round(totalPoints / pointsHistory.length)
                  : 0}
              </p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>
      </div>

      {/* Points History */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-xl font-semibold text-gray-900">
            Points History
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Detailed breakdown of all points you've earned
          </p>
        </div>

        {pointsHistory.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              No Points Yet
            </h4>
            <p className="text-gray-600">
              Complete your assigned tasks to start earning points!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {pointsHistory.map((item) => (
              <div
                key={item.history_id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">🎯</span>
                      <h4 className="font-semibold text-gray-900">
                        {item.subtasks?.title || 'Task Completed'}
                      </h4>
                    </div>
                    {item.subtasks?.tasks && (
                      <p className="text-sm text-gray-600 ml-7">
                        From:{' '}
                        <span className="font-medium">
                          {item.subtasks.tasks.heading}
                        </span>
                      </p>
                    )}
                    <p className="text-xs text-gray-500 ml-7 mt-1">
                      {formatDate(item.earned_at)}
                    </p>
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center gap-1">
                      <span className="text-2xl font-bold text-green-600">
                        +{item.points_earned}
                      </span>
                      <span className="text-sm text-gray-500">pts</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Achievement Badge Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Achievements
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            className={`p-4 rounded-lg border-2 text-center ${
              totalPoints >= 10
                ? 'border-yellow-400 bg-yellow-50'
                : 'border-gray-200 bg-gray-50 opacity-50'
            }`}
          >
            <div className="text-3xl mb-2">🌟</div>
            <p className="text-xs font-semibold">First Steps</p>
            <p className="text-xs text-gray-600">10+ points</p>
          </div>

          <div
            className={`p-4 rounded-lg border-2 text-center ${
              totalPoints >= 50
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 bg-gray-50 opacity-50'
            }`}
          >
            <div className="text-3xl mb-2">🎯</div>
            <p className="text-xs font-semibold">On Fire</p>
            <p className="text-xs text-gray-600">50+ points</p>
          </div>

          <div
            className={`p-4 rounded-lg border-2 text-center ${
              totalPoints >= 100
                ? 'border-purple-400 bg-purple-50'
                : 'border-gray-200 bg-gray-50 opacity-50'
            }`}
          >
            <div className="text-3xl mb-2">🚀</div>
            <p className="text-xs font-semibold">High Achiever</p>
            <p className="text-xs text-gray-600">100+ points</p>
          </div>

          <div
            className={`p-4 rounded-lg border-2 text-center ${
              totalPoints >= 500
                ? 'border-red-400 bg-red-50'
                : 'border-gray-200 bg-gray-50 opacity-50'
            }`}
          >
            <div className="text-3xl mb-2">👑</div>
            <p className="text-xs font-semibold">Legend</p>
            <p className="text-xs text-gray-600">500+ points</p>
          </div>
        </div>
      </div>
    </div>
  );
}
