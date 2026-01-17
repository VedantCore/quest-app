'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { getUserCompanies, updateUserName } from '../../app/actions';
import toast from 'react-hot-toast';
import { uploadAvatar } from '../../app/upload-actions';
import Image from 'next/image';
import { useLocale } from '../../context/LocaleContext';
import { getRank } from '../../lib/rankUtils';

export default function Profile({ userId, onStatsUpdate }) {
  const { user: authUser } = useAuth();
  const { t, locale } = useLocale();
  const [userInfo, setUserInfo] = useState(null);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [userCompanies, setUserCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchUserProfile();
    fetchUserCompanies();
  }, [userId]);

  const fetchUserCompanies = async () => {
    try {
      const result = await getUserCompanies(userId);
      console.log('getUserCompanies result:', result);
      if (result.success) {
        const companies = result.data || [];
        console.log('Setting user companies:', companies);
        setUserCompanies(companies);
      } else {
        console.error('Failed to get companies:', result.error);
      }
    } catch (error) {
      console.error('Error fetching user companies:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (userError) throw userError;
      setUserInfo(userData);
      setTotalPoints(userData.total_points || 0);

      const { data: historyData, error: historyError } = await supabase
        .from('user_point_history')
        .select(
          `history_id, points_earned, earned_at, step:task_steps (title, task:tasks (title, task_id))`
        )
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (historyError) {
        setPointsHistory([]);
      } else {
        setPointsHistory(historyData || []);
        if (onStatsUpdate) {
          onStatsUpdate({
            totalPoints: userData.total_points || 0,
            completedTasks: historyData?.length || 0,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNameUpdate = async () => {
    if (!newName.trim()) {
      toast.error(t('user.profile.nameRequired'));
      return;
    }

    try {
      const result = await updateUserName(userId, newName);
      if (result.success) {
        setUserInfo((prev) => ({ ...prev, name: newName }));
        setIsEditingName(false);
        toast.success(t('user.profile.nameUpdated'));
      } else {
        toast.error(result.message || t('user.profile.nameUpdateFailed'));
      }
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error(t('user.profile.nameUpdateFailed'));
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      toast.error(t('user.profile.uploadImageError'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      toast.error(t('user.profile.imageSizeError'));
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadAvatar(formData);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Update Supabase
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: result.url })
        .eq('user_id', userId);

      if (updateError) throw updateError;
      // Update Firebase Auth Profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          photoURL: result.url,
        });
      }
      // Update local state
      setUserInfo((prev) => ({ ...prev, avatar_url: result.url }));
      toast.success(t('user.profile.pictureUpdated'));
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast.error(t('user.profile.pictureUpdateFailed'));
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('user.profile.notSet');
    const localeMap = {
      en: 'en-US',
      id: 'id-ID',
      ja: 'ja-JP',
      zh: 'zh-CN',
    };
    return new Date(dateString).toLocaleDateString(
      localeMap[locale] || 'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }
    );
  };

  const providerId = authUser?.providerData?.[0]?.providerId;
  const isGoogleAuth = providerId === 'google.com';
  const isOwnProfile = authUser?.uid === userId;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <h3 className="text-lg font-bold text-slate-900">
          {t('common.profileNotFound')}
        </h3>
      </div>
    );
  }

  const filterHistory = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return pointsHistory.filter((item) => {
      const earnedDate = new Date(item.earned_at);

      // Custom date range filter
      if (historyFilter === 'custom') {
        let inRange = true;
        if (customDateFrom) {
          const fromDate = new Date(customDateFrom);
          fromDate.setHours(0, 0, 0, 0);
          inRange = inRange && earnedDate >= fromDate;
        }
        if (customDateTo) {
          const toDate = new Date(customDateTo);
          toDate.setHours(23, 59, 59, 999);
          inRange = inRange && earnedDate <= toDate;
        }
        return inRange;
      }

      if (historyFilter === 'thisWeek') return earnedDate >= weekAgo;
      if (historyFilter === 'thisMonth') return earnedDate >= monthAgo;
      return true;
    });
  };

  const filteredHistory = filterHistory();

  // Group history by task
  const groupedHistory = filteredHistory.reduce((acc, item) => {
    const taskId = item.step?.task?.task_id || 'general';
    const taskTitle = item.step?.task?.title || t('user.profile.generalAwards');

    if (!acc[taskId]) {
      acc[taskId] = {
        taskId,
        title: taskTitle,
        totalPoints: 0,
        items: [],
      };
    }

    acc[taskId].items.push(item);
    acc[taskId].totalPoints += item.points_earned;
    return acc;
  }, {});

  const toggleTask = (taskId) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  return (
    <div className="space-y-8">
      {/* Account Information Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-bold text-slate-900">
            {t('user.profile.accountInfo')}
          </h3>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex flex-col items-center text-center md:items-start md:text-left min-w-[200px]">
              <div
                className={`relative mb-4 group ${
                  isOwnProfile ? 'cursor-pointer' : ''
                }`}
                onClick={isOwnProfile ? handleImageClick : undefined}
              >
                {isOwnProfile && (
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                )}
                {userInfo.avatar_url ? (
                  <img
                    src={userInfo.avatar_url}
                    alt="Profile"
                    className={`w-24 h-24 rounded-full border-4 border-white shadow-md object-cover transition-opacity ${
                      uploading ? 'opacity-50' : 'group-hover:opacity-75'
                    }`}
                  />
                ) : (
                  <div
                    className={`w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-3xl text-white shadow-md transition-opacity ${
                      uploading ? 'opacity-50' : 'group-hover:opacity-75'
                    }`}
                  >
                    {(userInfo.name || userInfo.email)?.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Overlay for upload icon */}
                {isOwnProfile && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full hover:bg-black/30 transition-all pointer-events-none">
                    <svg
                      className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                )}

                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-40">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  </div>
                )}

                {isGoogleAuth && (
                  <div className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full shadow-sm border border-gray-100">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                  </div>
                )}
              </div>
              {isEditingName ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="text-xl font-bold text-slate-900 border-b-2 border-indigo-500 focus:outline-none bg-transparent w-full max-w-[200px]"
                    autoFocus
                  />
                  <button
                    onClick={handleNameUpdate}
                    className="p-1 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
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
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/name">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {userInfo.name || userInfo.email}
                  </h2>
                  {isOwnProfile && (
                    <button
                      onClick={() => {
                        setNewName(userInfo.name || userInfo.email);
                        setIsEditingName(true);
                      }}
                      className="opacity-0 group-hover/name:opacity-100 p-1 text-gray-400 hover:text-indigo-600 transition-all"
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
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                  {t('common.' + userInfo.role)}
                </span>
                {(userInfo.role === 'user' || userInfo.role === 'manager') &&
                  (() => {
                    const rank = getRank(totalPoints);
                    return (
                      <span
                        title={`${rank.name} (${rank.range})`}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full shadow-sm transition-all hover:scale-110 cursor-default ${rank.classes}`}
                      >
                        {rank.icon}
                      </span>
                    );
                  })()}
              </div>
            </div>

            <div className="flex-1 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    {t('user.profile.email')}
                  </label>
                  <p className="text-slate-900 font-medium border-b border-gray-100 pb-2">
                    {userInfo.email}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    {t('user.profile.memberSince')}
                  </label>
                  <p className="text-slate-900 font-medium border-b border-gray-100 pb-2">
                    {formatDate(userInfo.created_at)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {t('user.profile.assignedCompanies')}
                  </label>
                  <div className="border-b border-gray-100 pb-3">
                    {userCompanies.length === 0 ? (
                      <p className="text-gray-400 font-medium italic text-sm">
                        {t('user.profile.noCompanies')}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {userCompanies.map((company) => (
                          <span
                            key={company.company_id}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm hover:shadow-md transition-shadow"
                          >
                            {company.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {isOwnProfile && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        {t('user.profile.signInMethod')}
                      </label>
                      <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                        {isGoogleAuth ? (
                          <>
                            <span className="font-medium text-slate-900">
                              {t('user.profile.googleAccount')}
                            </span>
                            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">
                              {t('user.profile.secure')}
                            </span>
                          </>
                        ) : (
                          <span className="font-medium text-slate-900">
                            {t('user.profile.emailPassword')}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {userInfo.role === 'user' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              label: t('user.profile.totalEarned'),
              value: totalPoints,
              icon: (
                <svg
                  className="w-6 h-6 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ),
              color: 'blue',
            },
            {
              label: t('user.profile.completed'),
              value: pointsHistory.length,
              icon: (
                <svg
                  className="w-6 h-6 text-indigo-600"
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
              ),
              color: 'green',
            },
            {
              label: t('user.profile.average'),
              value:
                pointsHistory.length > 0
                  ? Math.round(totalPoints / pointsHistory.length)
                  : 0,
              icon: (
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              ),
              color: 'purple',
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 bg-${stat.color}-50 rounded-xl flex items-center justify-center`}
                >
                  {stat.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-indigo-600">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {userInfo.role === 'user' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {t('user.profile.pointsHistory')}
              </h3>
              <div className="flex gap-2 flex-wrap">
                {['all', 'thisWeek', 'thisMonth', 'custom'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setHistoryFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      historyFilter === filter
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter === 'all'
                      ? t('user.profile.allTime')
                      : filter === 'thisWeek'
                      ? t('user.profile.thisWeek')
                      : filter === 'thisMonth'
                      ? t('user.profile.thisMonth')
                      : t('user.profile.customRange')}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range Inputs */}
            {historyFilter === 'custom' && (
              <div className="flex flex-wrap gap-3 items-end pt-3 border-t border-gray-100">
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {t('admin.stats.fromDate')}
                  </label>
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {t('admin.stats.toDate')}
                  </label>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={() => {
                    setCustomDateFrom('');
                    setCustomDateTo('');
                  }}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                >
                  {t('user.profile.clear')}
                </button>
              </div>
            )}
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {Object.keys(groupedHistory).length === 0 ? (
              <div className="p-12 text-center">
                <div className="flex justify-center mb-3">
                  <svg
                    className="w-12 h-12 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                </div>
                <p className="text-gray-500">{t('user.profile.noActivity')}</p>
              </div>
            ) : (
              Object.values(groupedHistory).map((group) => (
                <div
                  key={group.taskId}
                  className="border-b border-gray-100 last:border-0"
                >
                  <div
                    onClick={() => toggleTask(group.taskId)}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                        <svg
                          className="w-5 h-5"
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
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">
                          {group.title}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {group.items.length}{' '}
                          {group.items.length !== 1
                            ? t('user.profile.steps')
                            : t('user.profile.step')}{' '}
                          {t('user.profile.completed')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-sm border border-indigo-100">
                        +{group.totalPoints} {t('common.pts')}
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedTasks[group.taskId]
                            ? 'transform rotate-180'
                            : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded Steps */}
                  {expandedTasks[group.taskId] && (
                    <div className="bg-gray-50 px-6 py-2 border-t border-gray-100">
                      {group.items.map((item) => (
                        <div
                          key={item.history_id}
                          className="py-3 flex items-center justify-between border-b border-gray-200 last:border-0"
                        >
                          <div className="flex items-center gap-3 pl-14">
                            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                {item.step?.title ||
                                  t('user.profile.taskCompleted')}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(item.earned_at)}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`text-sm font-semibold ${
                              item.points_earned >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {item.points_earned >= 0 ? '+' : ''}
                            {item.points_earned} {t('common.pts')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
