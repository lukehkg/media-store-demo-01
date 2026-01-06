'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { tenantAPI } from '@/lib/api';
import { useQuery } from 'react-query';
import { formatDistanceToNow, format } from 'date-fns';
import Viewer from 'react-viewer';

export default function ClientPortalPage() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [dragActive, setDragActive] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const { data: storageInfo, refetch: refetchStorage } = useQuery('storageInfo', tenantAPI.getStorageInfo);
  const { data: tenantInfo } = useQuery('tenantInfo', tenantAPI.getTenantInfo);
  const { data: photos, refetch: refetchPhotos } = useQuery('photos', () => tenantAPI.listPhotos());

  useEffect(() => {
    if (!user) {
      router.push('/client/login');
    }
  }, [user, router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
      } else {
        alert('Please drop an image file');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Check storage limit before upload
    if (storageInfo) {
      const remainingBytes = (storageInfo.storage_limit_mb * 1024 * 1024) - storageInfo.storage_used_bytes;
      if (selectedFile.size > remainingBytes) {
        const remainingMB = (remainingBytes / (1024 * 1024)).toFixed(2);
        alert(`Not enough storage space. You have ${remainingMB} MB remaining, but this file is ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB.`);
        return;
      }
    }

    // Validate file size (500 MB limit)
    const maxSize = 500 * 1024 * 1024; // 500 MB
    if (selectedFile.size > maxSize) {
      alert(`File size exceeds the 500 MB limit. Your file is ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`);
      return;
    }

    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setUploading(true);
    let uploadData: any = null;
    
    try {
      // Request upload URL
      console.log('Requesting upload URL for:', selectedFile.name, selectedFile.type, selectedFile.size);
      uploadData = await tenantAPI.requestUpload(
        selectedFile.name,
        selectedFile.type,
        selectedFile.size
      );

      if (!uploadData || !uploadData.upload_url) {
        throw new Error('Failed to get upload URL from server');
      }

      console.log('Got upload URL, uploading to B2...');

      // Upload directly to B2 using presigned URL
      // Note: Presigned URLs from B2 should work, but we need to handle CORS properly
      const uploadResponse = await fetch(uploadData.upload_url, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type,
        },
        mode: 'cors', // Explicitly set CORS mode
        cache: 'no-cache',
      });

      console.log('Upload response status:', uploadResponse.status, uploadResponse.statusText);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('B2 upload error:', errorText);
        throw new Error(`B2 upload failed (${uploadResponse.status}): ${errorText || uploadResponse.statusText}`);
      }

      console.log('Upload successful, confirming...');

      // Confirm upload
      await tenantAPI.confirmUpload(uploadData.photo_id);

      console.log('Upload confirmed, refreshing data...');

      // Refresh data
      await Promise.all([refetchStorage(), refetchPhotos()]);
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      alert('File uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error details:', {
        error,
        message: error?.message,
        response: error?.response?.data,
        uploadUrl: uploadData?.upload_url ? 'Present' : 'Missing'
      });
      
      let errorMessage = 'Upload failed. Please try again.';
      
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code === 'ECONNREFUSED' || error?.code === 'ERR_NETWORK') {
        errorMessage = 'Network error: Cannot connect to storage server. Please check your internet connection.';
      } else if (error?.response?.status === 403) {
        errorMessage = 'Storage limit exceeded or access denied.';
      } else if (error?.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      }
      
      alert(`Upload failed: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId: number) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      await tenantAPI.deletePhoto(photoId);
      refetchStorage();
      refetchPhotos();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed. Please try again.');
    }
  };

  if (!user) {
    return null;
  }

  const storagePercentage = storageInfo ? (storageInfo.storage_percentage || 0) : 0;
  const storageColor = storagePercentage > 90 ? 'bg-red-500' : storagePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Google Drive-like Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <svg className="w-8 h-8 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <h1 className="text-xl font-semibold text-gray-900">My Drive</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                  title="Grid view"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                  title="List view"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Enhanced Storage Info Bar - Prominently Displayed */}
        {storageInfo && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg border-2 border-blue-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">Storage Usage</div>
                  <div className="text-sm text-gray-700 mt-1">
                    <span className="font-semibold">{storageInfo.storage_used_mb.toFixed(2)} MB</span> used of{' '}
                    <span className="font-semibold">{storageInfo.storage_limit_mb} MB</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="font-medium text-green-700">
                      {(storageInfo.storage_limit_mb - storageInfo.storage_used_mb).toFixed(2)} MB remaining
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{storagePercentage.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">used</div>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${storageColor} shadow-sm`}
                style={{ width: `${Math.min(storagePercentage, 100)}%` }}
              ></div>
            </div>
            {tenantInfo && tenantInfo.days_remaining !== null && tenantInfo.days_remaining > 0 && (
              <div className="mt-3 text-sm text-gray-600 flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{tenantInfo.days_remaining} days remaining in your subscription</span>
              </div>
            )}
          </div>
        )}

        {/* Upload Area - Google Drive Style */}
        <div
          className={`bg-white rounded-lg border-2 border-dashed mb-6 transition-colors ${
            dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="p-8 text-center">
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  {selectedFile ? selectedFile.name : 'Drag files here or click to upload'}
                </p>
                {selectedFile && (
                  <p className="text-xs text-gray-500 mb-4">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
                {!selectedFile && (
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 500MB</p>
                )}
                {selectedFile && (
                  <div className="flex items-center space-x-3 mt-4">
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-2"
                    >
                      {uploading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span>Upload</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Files Grid/List - Google Drive Style */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">Files</h2>
            <span className="text-xs text-gray-500">{photos?.length || 0} items</span>
          </div>
          <div className="p-4">
            {photos && photos.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {photos.map((photo: any, index: number) => (
                    <div
                      key={photo.id}
                      className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div 
                        className="aspect-square bg-gray-100 relative overflow-hidden"
                        onClick={() => {
                          setPreviewIndex(index);
                          setPreviewVisible(true);
                        }}
                      >
                        <img
                          src={photo.download_url}
                          alt={photo.original_filename}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewIndex(index);
                              setPreviewVisible(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-opacity flex items-center space-x-1"
                            title="Preview"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>View</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(photo.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-700 transition-opacity flex items-center space-x-1"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-900 truncate" title={photo.original_filename}>
                          {photo.original_filename}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(photo.uploaded_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {photos.map((photo: any, index: number) => (
                    <div
                      key={photo.id}
                      className="group flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                      onClick={() => {
                        setPreviewIndex(index);
                        setPreviewVisible(true);
                      }}
                    >
                      <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                        <img
                          src={photo.download_url}
                          alt={photo.original_filename}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{photo.original_filename}</p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(photo.uploaded_at), { addSuffix: true })} • {(photo.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewIndex(index);
                            setPreviewVisible(true);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-700 p-2 transition-opacity"
                          title="Preview"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(photo.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 p-2 transition-opacity"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-16">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg font-medium">No files yet</p>
                <p className="text-sm text-gray-400 mt-2">Upload your first file to get started!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {photos && photos.length > 0 && (
        <Viewer
          visible={previewVisible}
          onClose={() => setPreviewVisible(false)}
          images={photos.map((photo: any) => ({
            src: photo.download_url,
            alt: photo.original_filename,
          }))}
          activeIndex={previewIndex}
          onChange={(_, index) => setPreviewIndex(index || 0)}
          zoomable={true}
          rotatable={true}
          scalable={true}
          noNavbar={false}
          noToolbar={false}
          downloadable={true}
        />
      )}
    </div>
  );
}
