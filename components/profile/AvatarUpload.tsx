'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

interface AvatarUploadProps {
  currentAvatar?: string | null;
  onUpload: (url: string) => void;
  disabled?: boolean;
}

export function AvatarUpload({ currentAvatar, onUpload, disabled }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentAvatar || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // TODO: Upload to Supabase Storage
      // For now, we'll use the data URL as a placeholder
      // In production, you should upload to Supabase Storage and get a URL
      const formData = new FormData();
      formData.append('file', file);

      // Placeholder: In a real implementation, upload to your storage service
      // const response = await fetch('/api/upload/avatar', {
      //   method: 'POST',
      //   body: formData,
      // });
      // const { url } = await response.json();

      // For now, just use the preview URL
      // In production, replace this with the actual uploaded URL
      onUpload(reader.result as string);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUpload('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center space-x-4">
      {/* Avatar Preview */}
      <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-300">
        {preview ? (
          <Image
            src={preview}
            alt="Avatar"
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg
              className="w-12 h-12"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Upload Controls */}
      <div className="flex flex-col space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
          className="hidden"
          id="avatar-upload"
        />
        <label
          htmlFor="avatar-upload"
          className={`
            px-4 py-2 text-sm font-medium rounded-md cursor-pointer
            ${
              disabled || isUploading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {isUploading ? 'Uploading...' : 'Upload Photo'}
        </label>
        {preview && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled || isUploading}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
          >
            Remove
          </button>
        )}
        <p className="text-xs text-gray-500">
          JPG, PNG or GIF. Max 5MB.
        </p>
      </div>
    </div>
  );
}
