'use client';

import { useState, useCallback } from 'react';
import axios from 'axios';

interface DetectionObject {
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
}

interface ImageRecord {
  imageId: string;
  originalName: string;
  mimeType: string;
  objects: DetectionObject[];
  createdAt: string;
}

interface Props {
  onDetectionComplete: (image: ImageRecord) => void;
}

export default function ImageUpload({ onDetectionComplete }: Props) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type)) {
        setError('Only JPEG, PNG, and WebP images are supported.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Image must be under 10 MB.');
        return;
      }

      setLoading(true);
      try {
        const form = new FormData();
        form.append('image', file);
        const res = await axios.post('/api/images', form);
        onDetectionComplete(res.data.image);
      } catch (err) {
        const msg = axios.isAxiosError(err)
          ? err.response?.data?.error ?? 'Upload failed'
          : 'Upload failed';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [onDetectionComplete]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-3">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors
          ${dragging ? 'border-violet-400 bg-violet-50' : 'border-gray-300 bg-gray-50 hover:border-violet-300 hover:bg-violet-50/40'}`}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-violet-600">
            <div className="w-8 h-8 border-4 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
            <p className="text-sm font-medium">Running detection...</p>
          </div>
        ) : (
          <>
            <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-medium text-gray-700">Drop an image here or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP — max 10 MB</p>
          </>
        )}
      </label>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
      )}
    </div>
  );
}
