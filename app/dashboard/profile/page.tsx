/**
 * Profile & Settings Page
 *
 * Comprehensive user and church profile management with tabbed navigation.
 * Includes personal profile, church profile, security, and notification settings.
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { PersonalProfileForm } from '@/components/profile/PersonalProfileForm';
import { ChurchProfileForm } from '@/components/profile/ChurchProfileForm';
import { SecuritySettings } from '@/components/profile/SecuritySettings';
import { NotificationSettings } from '@/components/profile/NotificationSettings';
import { Toaster } from 'react-hot-toast';

type Tab = 'personal' | 'church' | 'security' | 'notifications';

export default function ProfilePage() {
  const router = useRouter();
  const { user, church, isLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    // Check if user is admin (this should be fetched from user context or API)
    // For now, we'll assume they're admin if they have a church
    // In a real implementation, check the user's role
    const checkAdminStatus = async () => {
      if (user && church) {
        try {
          const response = await fetch(`/api/church/profile?churchId=${church.id}`);
          setIsAdmin(response.ok);
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      }
    };

    checkAdminStatus();
  }, [user, church]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tabs = [
    { id: 'personal' as Tab, label: 'Personal Profile', icon: '👤' },
    { id: 'church' as Tab, label: 'Church Profile', icon: '⛪', adminOnly: true },
    { id: 'security' as Tab, label: 'Security', icon: '🔒' },
    { id: 'notifications' as Tab, label: 'Notifications', icon: '🔔' },
  ];

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-6">
              <div>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Dashboard
                </button>
                <h1 className="text-3xl font-bold text-gray-900">Profile & Settings</h1>
                <p className="text-gray-600 mt-1">Manage your account and preferences</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => {
                // Hide church tab for non-admins
                if (tab.adminOnly && !isAdmin) {
                  return null;
                }

                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                      ${
                        isActive
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="bg-white">
            <div className="p-6">
              {activeTab === 'personal' && (
                <PersonalProfileForm userId={user.id} />
              )}
              {activeTab === 'church' && church && (
                <ChurchProfileForm churchId={church.id} isAdmin={isAdmin} />
              )}
              {activeTab === 'security' && (
                <SecuritySettings />
              )}
              {activeTab === 'notifications' && (
                <NotificationSettings />
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
