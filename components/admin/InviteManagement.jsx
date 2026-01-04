'use client';
import { useState, useEffect } from 'react';
import { auth } from '../../lib/firebase';
import { createInviteAction, getInvitesAction } from '@/app/invite-actions';
import toast from 'react-hot-toast';
import { useLocale } from '../../context/LocaleContext';

export default function InviteManagement() {
  const { t } = useLocale();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const result = await getInvitesAction(token);

      if (!result.success) throw new Error(result.error);
      setInvites(result.data || []);
    } catch (error) {
      console.error('Error fetching invites:', error);
      toast.error(t('inviteManagement.generateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const generateInvite = async () => {
    setGenerating(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast.error(t('common.unauthorized'));
        return;
      }

      const result = await createInviteAction(token);

      if (!result.success) throw new Error(result.error);

      const data = result.data;
      setInvites([data, ...invites]);
      toast.success(t('inviteManagement.linkCopied'));

      // Copy to clipboard
      const url = `${window.location.origin}/invite/${data.code}`;
      navigator.clipboard.writeText(url);
      toast.success(t('inviteManagement.linkCopied'));
    } catch (error) {
      console.error('Error generating invite:', error);
      toast.error(t('inviteManagement.generateFailed'));
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = (code) => {
    const url = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(url);
    toast.success(t('inviteManagement.linkCopied'));
  };

  if (loading)
    return <div className="p-4">{t('inviteManagement.loading')}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">
          {t('inviteManagement.title')}
        </h2>
        <button
          onClick={generateInvite}
          disabled={generating}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {generating ? (
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
          ) : (
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
                d="M12 4v16m8-8H4"
              />
            </svg>
          )}
          {t('inviteManagement.generate')}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('inviteManagement.code')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('inviteManagement.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('inviteManagement.createdAt')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('inviteManagement.usedBy')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('inviteManagement.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invites.map((invite) => (
              <tr key={invite.code} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-900">
                  {invite.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      invite.is_used
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {invite.is_used
                      ? t('inviteManagement.used')
                      : t('inviteManagement.active')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(invite.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {invite.used_by || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {!invite.is_used && (
                    <button
                      onClick={() => copyLink(invite.code)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      {t('inviteManagement.copyLink')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {invites.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  className="px-6 py-12 text-center text-gray-500"
                >
                  {t('inviteManagement.noInvites')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
