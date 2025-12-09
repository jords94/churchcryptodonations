'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Session {
  id: string;
  device: string;
  ipAddress: string;
  lastActive: string;
  current: boolean;
  createdAt: string;
}

export function SessionList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/user/sessions');
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string, isCurrent: boolean) => {
    if (isCurrent) {
      if (!confirm('This will sign you out of your current session. Continue?')) {
        return;
      }
    } else {
      if (!confirm('Are you sure you want to revoke this session?')) {
        return;
      }
    }

    setRevoking(sessionId);

    try {
      const response = await fetch('/api/user/sessions?scope=current', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to revoke session');

      toast.success('Session revoked successfully');

      if (isCurrent) {
        // Redirect to login page
        window.location.href = '/login';
      } else {
        // Refresh session list
        fetchSessions();
      }
    } catch (error) {
      console.error('Error revoking session:', error);
      toast.error('Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    if (!confirm('This will sign you out of all other devices. Continue?')) {
      return;
    }

    setRevoking('all');

    try {
      const response = await fetch('/api/user/sessions?scope=all', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to revoke all sessions');

      toast.success('All other sessions revoked successfully');
      window.location.href = '/login';
    } catch (error) {
      console.error('Error revoking all sessions:', error);
      toast.error('Failed to revoke all sessions');
    } finally {
      setRevoking(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const getDeviceIcon = (device: string) => {
    const deviceLower = device.toLowerCase();
    if (deviceLower.includes('mobile') || deviceLower.includes('android') || deviceLower.includes('iphone')) {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Active Sessions</h3>
        {sessions.length > 1 && (
          <button
            onClick={handleRevokeAllOthers}
            disabled={revoking === 'all'}
            className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
          >
            {revoking === 'all' ? 'Revoking...' : 'Revoke All Others'}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
          >
            <div className="flex items-start space-x-3">
              <div className="text-gray-500 mt-1">
                {getDeviceIcon(session.device)}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <p className="font-medium text-gray-900">
                    {session.device.split('/')[0].slice(0, 50)}
                  </p>
                  {session.current && (
                    <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  IP: {session.ipAddress}
                </p>
                <p className="text-sm text-gray-500">
                  Last active: {formatDate(session.lastActive)}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleRevokeSession(session.id, session.current)}
              disabled={revoking === session.id}
              className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
            >
              {revoking === session.id ? 'Revoking...' : 'Revoke'}
            </button>
          </div>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No active sessions found</p>
        </div>
      )}
    </div>
  );
}
