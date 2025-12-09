'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { churchProfileSchema, type ChurchProfileFormData, timezones } from '@/lib/validations/profile';
import { toast } from 'react-hot-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LogoUpload } from './LogoUpload';

interface ChurchProfileFormProps {
  churchId: string;
  isAdmin: boolean;
}

export function ChurchProfileForm({ churchId, isAdmin }: ChurchProfileFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [churchData, setChurchData] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm<ChurchProfileFormData>({
    resolver: zodResolver(churchProfileSchema),
  });

  const country = watch('country');

  useEffect(() => {
    fetchChurchProfile();
  }, [churchId]);

  const fetchChurchProfile = async () => {
    try {
      const response = await fetch(`/api/church/profile?churchId=${churchId}`);
      if (!response.ok) throw new Error('Failed to fetch church profile');
      const data = await response.json();
      setChurchData(data);
      reset({
        name: data.name || '',
        officialName: data.officialName || '',
        contactEmail: data.contactEmail || data.email || '',
        contactPhone: data.contactPhone || data.phone || '',
        website: data.website || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        postalCode: data.postalCode || '',
        country: data.country || 'AU',
        taxId: data.taxId || '',
        taxIdType: data.taxIdType || '',
        isDgrRegistered: data.isDgrRegistered || false,
        denomination: data.denomination || '',
        congregationSize: data.congregationSize || '',
        brandColor: data.brandColor || '#3B82F6',
        donationMessage: data.donationMessage || '',
        defaultCurrency: data.defaultCurrency || 'AUD',
        timezone: data.timezone || 'Australia/Sydney',
      });
    } catch (error) {
      console.error('Error fetching church profile:', error);
      toast.error('Failed to load church profile');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ChurchProfileFormData) => {
    if (!isAdmin) {
      toast.error('Only administrators can edit church settings');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/church/profile?churchId=${churchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update church profile');
      }

      const updatedData = await response.json();
      setChurchData(updatedData);
      reset(data);
      toast.success('Church profile updated successfully');
    } catch (error: any) {
      console.error('Error updating church profile:', error);
      toast.error(error.message || 'Failed to update church profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (url: string) => {
    // TODO: Update logo URL in the database
    toast.success('Logo uploaded successfully');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Only administrators can edit church settings.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Basic Information */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
        <div className="space-y-4">
          {/* Church Logo */}
          <div>
            <Label>Church Logo</Label>
            <div className="mt-2">
              <LogoUpload
                currentLogo={churchData?.logo}
                onUpload={handleLogoUpload}
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Church Name */}
          <div>
            <Label htmlFor="name">Church Name *</Label>
            <Input
              id="name"
              type="text"
              {...register('name')}
              disabled={isSaving}
              placeholder="First Baptist Church"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Official/Legal Name */}
          <div>
            <Label htmlFor="officialName">Official/Legal Name</Label>
            <Input
              id="officialName"
              type="text"
              {...register('officialName')}
              disabled={isSaving}
              placeholder="For tax receipts if different from display name"
            />
            {errors.officialName && (
              <p className="mt-1 text-sm text-red-600">{errors.officialName.message}</p>
            )}
          </div>

          {/* Website */}
          <div>
            <Label htmlFor="website">Website URL</Label>
            <Input
              id="website"
              type="url"
              {...register('website')}
              disabled={isSaving}
              placeholder="https://www.church.com"
            />
            {errors.website && (
              <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
            )}
          </div>

          {/* Contact Email */}
          <div>
            <Label htmlFor="contactEmail">Contact Email *</Label>
            <Input
              id="contactEmail"
              type="email"
              {...register('contactEmail')}
              disabled={isSaving}
              placeholder="info@church.com"
            />
            {errors.contactEmail && (
              <p className="mt-1 text-sm text-red-600">{errors.contactEmail.message}</p>
            )}
          </div>

          {/* Contact Phone */}
          <div>
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input
              id="contactPhone"
              type="tel"
              {...register('contactPhone')}
              disabled={isSaving}
              placeholder="+61 2 9999 9999"
            />
            {errors.contactPhone && (
              <p className="mt-1 text-sm text-red-600">{errors.contactPhone.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* Address */}
      <section className="border-t border-gray-200 pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              type="text"
              {...register('address')}
              disabled={isSaving}
              placeholder="123 Main Street"
            />
            {errors.address && (
              <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                type="text"
                {...register('city')}
                disabled={isSaving}
                placeholder="Sydney"
              />
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                type="text"
                {...register('state')}
                disabled={isSaving}
                placeholder="NSW"
              />
              {errors.state && (
                <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                type="text"
                {...register('postalCode')}
                disabled={isSaving}
                placeholder="2000"
              />
              {errors.postalCode && (
                <p className="mt-1 text-sm text-red-600">{errors.postalCode.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="country">Country</Label>
              <select
                id="country"
                {...register('country')}
                disabled={isSaving}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="AU">Australia</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="NZ">New Zealand</option>
                <option value="CA">Canada</option>
              </select>
              {errors.country && (
                <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tax & Compliance */}
      <section className="border-t border-gray-200 pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax & Compliance</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="taxIdType">Tax ID Type</Label>
              <select
                id="taxIdType"
                {...register('taxIdType')}
                disabled={isSaving}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select type</option>
                <option value="ABN">ABN (Australian Business Number)</option>
                <option value="EIN">EIN (US Employer ID)</option>
                <option value="CRN">CRN (Canadian Business Number)</option>
                <option value="Other">Other</option>
              </select>
              {errors.taxIdType && (
                <p className="mt-1 text-sm text-red-600">{errors.taxIdType.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="taxId">Tax ID</Label>
              <Input
                id="taxId"
                type="text"
                {...register('taxId')}
                disabled={isSaving}
                placeholder={country === 'AU' ? '12345678901' : 'Tax ID'}
              />
              {errors.taxId && (
                <p className="mt-1 text-sm text-red-600">{errors.taxId.message}</p>
              )}
            </div>
          </div>

          {country === 'AU' && (
            <div className="flex items-center">
              <input
                id="isDgrRegistered"
                type="checkbox"
                {...register('isDgrRegistered')}
                disabled={isSaving}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isDgrRegistered" className="ml-2 text-sm text-gray-700">
                DGR Registered (Deductible Gift Recipient)
              </label>
            </div>
          )}
        </div>
      </section>

      {/* Additional Information */}
      <section className="border-t border-gray-200 pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="denomination">Denomination</Label>
            <select
              id="denomination"
              {...register('denomination')}
              disabled={isSaving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select denomination</option>
              <option value="Non-denominational">Non-denominational</option>
              <option value="Baptist">Baptist</option>
              <option value="Catholic">Catholic</option>
              <option value="Anglican">Anglican</option>
              <option value="Methodist">Methodist</option>
              <option value="Presbyterian">Presbyterian</option>
              <option value="Pentecostal">Pentecostal</option>
              <option value="Lutheran">Lutheran</option>
              <option value="Orthodox">Orthodox</option>
              <option value="Other">Other</option>
            </select>
            {errors.denomination && (
              <p className="mt-1 text-sm text-red-600">{errors.denomination.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="congregationSize">Congregation Size</Label>
            <select
              id="congregationSize"
              {...register('congregationSize')}
              disabled={isSaving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select size</option>
              <option value="Small (1-100)">Small (1-100)</option>
              <option value="Medium (101-500)">Medium (101-500)</option>
              <option value="Large (501-2000)">Large (501-2000)</option>
              <option value="Mega (2000+)">Mega (2000+)</option>
            </select>
            {errors.congregationSize && (
              <p className="mt-1 text-sm text-red-600">{errors.congregationSize.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* Branding */}
      <section className="border-t border-gray-200 pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Branding</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="brandColor">Brand Color</Label>
            <div className="flex items-center space-x-2">
              <input
                id="brandColor"
                type="color"
                {...register('brandColor')}
                disabled={isSaving}
                className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
              />
              <Input
                type="text"
                {...register('brandColor')}
                disabled={isSaving}
                placeholder="#3B82F6"
                className="flex-1"
              />
            </div>
            {errors.brandColor && (
              <p className="mt-1 text-sm text-red-600">{errors.brandColor.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Used for QR codes and donation page
            </p>
          </div>

          <div>
            <Label htmlFor="donationMessage">Donation Page Custom Message</Label>
            <textarea
              id="donationMessage"
              {...register('donationMessage')}
              disabled={isSaving}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Thank you for supporting our ministry..."
            />
            {errors.donationMessage && (
              <p className="mt-1 text-sm text-red-600">{errors.donationMessage.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* Settings */}
      <section className="border-t border-gray-200 pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="defaultCurrency">Default Currency</Label>
              <select
                id="defaultCurrency"
                {...register('defaultCurrency')}
                disabled={isSaving}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="AUD">AUD - Australian Dollar</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
              {errors.defaultCurrency && (
                <p className="mt-1 text-sm text-red-600">{errors.defaultCurrency.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                {...register('timezone')}
                disabled={isSaving}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              {errors.timezone && (
                <p className="mt-1 text-sm text-red-600">{errors.timezone.message}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex justify-end border-t border-gray-200 pt-6">
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
