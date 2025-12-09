'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

interface LogoUploadProps {
  currentLogo?: string | null;
  onUpload: (url: string) => void;
  disabled?: boolean;
}

export function LogoUpload({ currentLogo, onUpload, disabled }: LogoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentLogo || null);
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
      // const response = await fetch('/api/upload/logo', {
      //   method: 'POST',
      //   body: formData,
      // });
      // const { url } = await response.json();

      // For now, just use the preview URL
      // In production, replace this with the actual uploaded URL
      onUpload(reader.result as string);
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo. Please try again.');
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
      {/* Logo Preview */}
      <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-300">
        {preview ? (
          <Image
            src={preview}
            alt="Church Logo"
            fill
            className="object-contain p-2"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg
              className="w-16 h-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
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
          id="logo-upload"
        />
        <label
          htmlFor="logo-upload"
          className={`
            px-4 py-2 text-sm font-medium rounded-md cursor-pointer text-center
            ${
              disabled || isUploading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {isUploading ? 'Uploading...' : 'Upload Logo'}
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
          PNG or SVG recommended. Max 5MB.
        </p>
      </div>
    </div>
  );
}
