'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  changePasswordSchema,
  changeEmailSchema,
  calculatePasswordStrength,
  type ChangePasswordFormData,
  type ChangeEmailFormData,
} from '@/lib/validations/profile';
import { toast } from 'react-hot-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { SessionList } from './SessionList';

export function SecuritySettings() {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', color: '' });

  // Password Change Form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    watch: watchPassword,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  // Email Change Form
  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors },
    reset: resetEmail,
  } = useForm<ChangeEmailFormData>({
    resolver: zodResolver(changeEmailSchema),
  });

  // Watch new password for strength indicator
  const newPassword = watchPassword('newPassword');

  // Update password strength indicator
  useState(() => {
    if (newPassword) {
      setPasswordStrength(calculatePasswordStrength(newPassword));
    }
  });

  const onSubmitPassword = async (data: ChangePasswordFormData) => {
    setIsChangingPassword(true);

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change password');
      }

      resetPassword();
      toast.success('Password changed successfully');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const onSubmitEmail = async (data: ChangeEmailFormData) => {
    setIsChangingEmail(true);

    try {
      const response = await fetch('/api/user/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change email');
      }

      resetEmail();
      toast.success('Verification email sent. Please check your inbox.');
    } catch (error: any) {
      console.error('Error changing email:', error);
      toast.error(error.message || 'Failed to change email');
    } finally {
      setIsChangingEmail(false);
    }
  };

  const getPasswordStrengthColor = (color: string) => {
    switch (color) {
      case 'red':
        return 'bg-red-500';
      case 'orange':
        return 'bg-orange-500';
      case 'yellow':
        return 'bg-yellow-500';
      case 'green':
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className="space-y-8">
      {/* Change Password */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
        <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4 max-w-md">
          <div>
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              {...registerPassword('currentPassword')}
              disabled={isChangingPassword}
              placeholder="Enter current password"
            />
            {passwordErrors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              {...registerPassword('newPassword')}
              disabled={isChangingPassword}
              placeholder="Enter new password"
            />
            {newPassword && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Password Strength:</span>
                  <span className={`font-medium ${
                    passwordStrength.color === 'red' ? 'text-red-600' :
                    passwordStrength.color === 'orange' ? 'text-orange-600' :
                    passwordStrength.color === 'yellow' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getPasswordStrengthColor(passwordStrength.color)}`}
                    style={{ width: `${(passwordStrength.score / 7) * 100}%` }}
                  />
                </div>
              </div>
            )}
            {passwordErrors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              {...registerPassword('confirmPassword')}
              disabled={isChangingPassword}
              placeholder="Confirm new password"
            />
            {passwordErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isChangingPassword}
          >
            {isChangingPassword ? 'Changing Password...' : 'Change Password'}
          </Button>
        </form>
      </section>

      {/* Change Email */}
      <section className="border-t border-gray-200 pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Email Address</h3>
        <form onSubmit={handleSubmitEmail(onSubmitEmail)} className="space-y-4 max-w-md">
          <div>
            <Label htmlFor="newEmail">New Email Address</Label>
            <Input
              id="newEmail"
              type="email"
              {...registerEmail('newEmail')}
              disabled={isChangingEmail}
              placeholder="new@email.com"
            />
            {emailErrors.newEmail && (
              <p className="mt-1 text-sm text-red-600">{emailErrors.newEmail.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="passwordForEmail">Current Password</Label>
            <Input
              id="passwordForEmail"
              type="password"
              {...registerEmail('password')}
              disabled={isChangingEmail}
              placeholder="Enter password to confirm"
            />
            {emailErrors.password && (
              <p className="mt-1 text-sm text-red-600">{emailErrors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isChangingEmail}
          >
            {isChangingEmail ? 'Sending Verification...' : 'Change Email'}
          </Button>

          <p className="text-sm text-gray-500">
            You will receive a verification email at your new address. Please click the link to confirm the change.
          </p>
        </form>
      </section>

      {/* Two-Factor Authentication */}
      <section className="border-t border-gray-200 pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h3>
        <div className="flex items-center justify-between max-w-2xl">
          <div>
            <p className="text-sm text-gray-600">
              Add an extra layer of security to your account by enabling two-factor authentication.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Status: <span className="font-medium text-red-600">Disabled</span>
            </p>
          </div>
          <Button variant="outline">
            Enable 2FA
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Note: 2FA setup functionality will be available in a future update.
        </p>
      </section>

      {/* Active Sessions */}
      <section className="border-t border-gray-200 pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Sessions</h3>
        <p className="text-sm text-gray-600 mb-4">
          Manage your active sessions across different devices. You can revoke access to any device at any time.
        </p>
        <SessionList />
      </section>
    </div>
  );
}
