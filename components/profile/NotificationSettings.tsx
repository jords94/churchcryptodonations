'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { notificationPreferencesSchema, type NotificationPreferencesData } from '@/lib/validations/profile';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';

export function NotificationSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { isDirty },
    reset,
    watch,
  } = useForm<NotificationPreferencesData>({
    resolver: zodResolver(notificationPreferencesSchema),
    defaultValues: {
      donationReceived: true,
      dailySummary: false,
      weeklySummary: true,
      monthlyReport: true,
      lowBalanceAlerts: true,
      securityAlerts: true,
      productUpdates: true,
    },
  });

  // Auto-save when preferences change
  const watchedValues = watch();

  useEffect(() => {
    fetchPreferences();
  }, []);

  useEffect(() => {
    // Auto-save when any preference changes (after initial load)
    if (!isLoading && isDirty) {
      const timer = setTimeout(() => {
        handleSubmit(onSubmit)();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [watchedValues, isDirty, isLoading]);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/user/notifications');
      if (!response.ok) throw new Error('Failed to fetch notification preferences');
      const data = await response.json();
      reset(data);
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: NotificationPreferencesData) => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/user/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update notification preferences');
      }

      reset(data);
      toast.success('Preferences saved');
    } catch (error: any) {
      console.error('Error updating notification preferences:', error);
      toast.error(error.message || 'Failed to update preferences');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Notifications</h3>
        <p className="text-sm text-gray-600 mb-6">
          Choose which email notifications you'd like to receive. Changes are saved automatically.
        </p>
      </div>

      <form className="space-y-6">
        {/* Donation Notifications */}
        <section>
          <h4 className="text-md font-medium text-gray-900 mb-4">Donation Notifications</h4>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="donationReceived"
                  type="checkbox"
                  {...register('donationReceived')}
                  disabled={isSaving}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="donationReceived" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Donation Received (Instant)
                </label>
                <p className="text-sm text-gray-500">
                  Get notified immediately when a donation is received
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="dailySummary"
                  type="checkbox"
                  {...register('dailySummary')}
                  disabled={isSaving}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="dailySummary" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Daily Donation Summary
                </label>
                <p className="text-sm text-gray-500">
                  Receive a daily summary of all donations (sent at 6 PM)
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="weeklySummary"
                  type="checkbox"
                  {...register('weeklySummary')}
                  disabled={isSaving}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="weeklySummary" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Weekly Donation Summary
                </label>
                <p className="text-sm text-gray-500">
                  Receive a weekly summary every Monday morning
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="monthlyReport"
                  type="checkbox"
                  {...register('monthlyReport')}
                  disabled={isSaving}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="monthlyReport" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Monthly Donation Report
                </label>
                <p className="text-sm text-gray-500">
                  Comprehensive monthly report on the 1st of each month
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Alerts */}
        <section className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Alerts</h4>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="lowBalanceAlerts"
                  type="checkbox"
                  {...register('lowBalanceAlerts')}
                  disabled={isSaving}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="lowBalanceAlerts" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Low Balance Alerts
                </label>
                <p className="text-sm text-gray-500">
                  Get notified when wallet balances are low
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="securityAlerts"
                  type="checkbox"
                  {...register('securityAlerts')}
                  disabled={true} // Cannot be disabled
                  checked={true}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded opacity-50 cursor-not-allowed"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="securityAlerts" className="text-sm font-medium text-gray-700">
                  Security Alerts
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded">
                    Required
                  </span>
                </label>
                <p className="text-sm text-gray-500">
                  Important security notifications (cannot be disabled)
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Product Updates */}
        <section className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Product Updates</h4>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="productUpdates"
                  type="checkbox"
                  {...register('productUpdates')}
                  disabled={isSaving}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="productUpdates" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Product Updates and Tips
                </label>
                <p className="text-sm text-gray-500">
                  Learn about new features and get helpful tips
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Auto-save indicator */}
        {isSaving && (
          <div className="flex items-center text-sm text-gray-600">
            <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Saving...
          </div>
        )}
      </form>
    </div>
  );
}
