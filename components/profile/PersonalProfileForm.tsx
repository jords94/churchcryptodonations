'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { personalProfileSchema, type PersonalProfileFormData } from '@/lib/validations/profile';
import { toast } from 'react-hot-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AvatarUpload } from './AvatarUpload';

interface PersonalProfileFormProps {
  userId: string;
}

export function PersonalProfileForm({ userId }: PersonalProfileFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
  } = useForm<PersonalProfileFormData>({
    resolver: zodResolver(personalProfileSchema),
  });

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      const data = await response.json();
      setProfileData(data);
      reset({
        name: data.name,
        email: data.email,
        phone: data.phone || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: PersonalProfileFormData) => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const updatedData = await response.json();
      setProfileData(updatedData);
      reset(data); // Reset form to mark as not dirty
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (url: string) => {
    // TODO: Update avatar URL in the database
    toast.success('Avatar uploaded successfully');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Profile Photo */}
      <div>
        <Label>Profile Photo</Label>
        <div className="mt-2">
          <AvatarUpload
            currentAvatar={profileData?.avatarUrl}
            onUpload={handleAvatarUpload}
            disabled={isSaving}
          />
        </div>
      </div>

      {/* Full Name */}
      <div>
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name"
          type="text"
          {...register('name')}
          disabled={isSaving}
          placeholder="Enter your full name"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Email Address */}
      <div>
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          disabled={true} // Email changes require verification
          placeholder="your@email.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          To change your email, use the Security tab
        </p>
      </div>

      {/* Phone Number */}
      <div>
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          {...register('phone')}
          disabled={isSaving}
          placeholder="+61 400 000 000"
        />
        {errors.phone && (
          <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Used for two-factor authentication
        </p>
      </div>

      {/* Read-only Information */}
      <div className="border-t border-gray-200 pt-6 space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Account Information</h3>

        <div>
          <Label>Role</Label>
          <p className="mt-1 text-sm text-gray-600">
            {profileData?.roleDisplay || 'Loading...'}
          </p>
        </div>

        <div>
          <Label>Account Created</Label>
          <p className="mt-1 text-sm text-gray-600">
            {profileData?.createdAt
              ? new Date(profileData.createdAt).toLocaleDateString('en-AU', {
                  dateStyle: 'long',
                })
              : 'Loading...'}
          </p>
        </div>

        {profileData?.lastLoginAt && (
          <div>
            <Label>Last Login</Label>
            <p className="mt-1 text-sm text-gray-600">
              {new Date(profileData.lastLoginAt).toLocaleString('en-AU', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!isDirty || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
