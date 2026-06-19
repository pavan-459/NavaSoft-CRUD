'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import VideoUpload from '@/components/VideoUpload';
import VideoPlayer from '@/components/VideoPlayer';
import ProgressTracker from '@/components/ProgressTracker';
import ResultsViewer from '@/components/ResultsViewer';
import ImageUpload from '@/components/ImageUpload';
import ImageResult from '@/components/ImageResult';

interface VideoRecord {
  uploadId: string;
  originalName: string;
  status: string;
  createdAt: string;
  results: unknown[];
}

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

type Tab = 'video' | 'image';

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('video');
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageRecord | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await axios.get('/api/videos');
      setVideos(res.data.videos);
    } catch { /* silent */ }
  }, []);

  const fetchImages = useCallback(async () => {
    try {
      const res = await axios.get('/api/images');
      setImages(res.data.images);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchVideos();
      fetchImages();
    }
  }, [status, fetchVideos, fetchImages]);

  const handleVideoUploadComplete = (uploadId: string) => {
    setActiveUploadId(uploadId);
    setSelectedVideo(null);
    fetchVideos();
  };

  const handleVideoProcessingComplete = async () => {
    await fetchVideos();
    if (activeUploadId) {
      const res = await axios.get(`/api/videos/${activeUploadId}`);
      setSelectedVideo(res.data.video);
    }
  };

  const handleImageDetectionComplete = (image: ImageRecord) => {
    setSelectedImage(image);
    fetchImages();
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-6">

        {/* Tab bar */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
          {(['video', 'image'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelectedVideo(null); setSelectedImage(null); setActiveUploadId(null); }}
              className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize
                ${tab === t ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {t === 'video' ? 'Video' : 'Image'}
            </button>
          ))}
        </div>

        {/* ── VIDEO TAB ── */}
        {tab === 'video' && (
          <>
            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold mb-4 text-gray-800">Upload Video</h2>
              <VideoUpload onUploadComplete={handleVideoUploadComplete} />
            </section>

            {activeUploadId && (
              <section>
                <ProgressTracker uploadId={activeUploadId} onComplete={handleVideoProcessingComplete} />
              </section>
            )}

            {selectedVideo && selectedVideo.status === 'completed' && (
              <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
                <h2 className="text-base font-semibold text-gray-800">
                  Results — {selectedVideo.originalName}
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <VideoPlayer uploadId={selectedVideo.uploadId} />
                  <ResultsViewer
                    results={selectedVideo.results as Parameters<typeof ResultsViewer>[0]['results']}
                  />
                </div>
              </section>
            )}

            {videos.length > 0 && (
              <section className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold mb-4 text-gray-800">Your Videos</h2>
                <div className="divide-y divide-gray-100">
                  {videos.map((v) => (
                    <div key={v.uploadId} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{v.originalName}</p>
                        <p className="text-xs text-gray-400">{new Date(v.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full
                          ${v.status === 'completed' ? 'bg-green-100 text-green-700' :
                            v.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'}`}>
                          {v.status}
                        </span>
                        {v.status === 'completed' && (
                          <button
                            onClick={async () => {
                              const res = await axios.get(`/api/videos/${v.uploadId}`);
                              setSelectedVideo(res.data.video);
                              setActiveUploadId(null);
                            }}
                            className="text-xs text-violet-600 hover:underline"
                          >
                            View results
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* ── IMAGE TAB ── */}
        {tab === 'image' && (
          <>
            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold mb-4 text-gray-800">Scan an Image</h2>
              <ImageUpload onDetectionComplete={handleImageDetectionComplete} />
            </section>

            {selectedImage && (
              <section className="bg-white rounded-2xl border border-gray-200 p-6">
                <ImageResult
                  imageId={selectedImage.imageId}
                  originalName={selectedImage.originalName}
                  objects={selectedImage.objects}
                />
              </section>
            )}

            {images.length > 0 && (
              <section className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold mb-4 text-gray-800">Your Images</h2>
                <div className="divide-y divide-gray-100">
                  {images.map((img) => (
                    <div key={img.imageId} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{img.originalName}</p>
                        <p className="text-xs text-gray-400">{new Date(img.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs bg-violet-100 text-violet-700 px-2.5 py-0.5 rounded-full font-medium">
                          {img.objects.length} object{img.objects.length !== 1 ? 's' : ''}
                        </span>
                        <button
                          onClick={() => setSelectedImage(img)}
                          className="text-xs text-violet-600 hover:underline"
                        >
                          View results
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
