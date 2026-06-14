'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type Status = 'pending' | 'extracting' | 'detecting' | 'completed' | 'failed';

interface Props {
  uploadId: string;
  onComplete: () => void;
}

const steps: { key: Status; label: string }[] = [
  { key: 'pending', label: 'Queued' },
  { key: 'extracting', label: 'Extracting frames' },
  { key: 'detecting', label: 'Running YOLO detection' },
  { key: 'completed', label: 'Completed' },
];

const statusOrder: Record<Status, number> = {
  pending: 0, extracting: 1, detecting: 2, completed: 3, failed: 4,
};

export default function ProgressTracker({ uploadId, onComplete }: Props) {
  const [status, setStatus] = useState<Status>('pending');
  const [frameProgress, setFrameProgress] = useState<{ frame: number; total: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const socket: Socket = io({ path: '/socket.io' });

    socket.emit('join', uploadId);

    socket.on('status', (data: { uploadId: string; status: Status; error?: string }) => {
      if (data.uploadId !== uploadId) return;
      setStatus(data.status);
      if (data.status === 'failed') setError(data.error || 'Processing failed');
      if (data.status === 'completed') onComplete();
    });

    socket.on('progress', (data: { uploadId: string; frame: number; total: number }) => {
      if (data.uploadId === uploadId) setFrameProgress(data);
    });

    return () => { socket.disconnect(); };
  }, [uploadId, onComplete]);

  const currentStep = statusOrder[status];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-800 mb-5">Processing Status</h3>

      <ol className="flex flex-col gap-4">
        {steps.map((step, i) => {
          const done = currentStep > i;
          const active = currentStep === i;
          return (
            <li key={step.key} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                ${status === 'failed' && active ? 'bg-red-100 text-red-600' :
                  done ? 'bg-green-100 text-green-600' :
                  active ? 'bg-blue-100 text-blue-600' :
                  'bg-gray-100 text-gray-400'}`}>
                {done ? '✓' : i + 1}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${active ? 'text-blue-700' : done ? 'text-green-700' : 'text-gray-500'}`}>
                  {step.label}
                </p>
                {active && step.key === 'detecting' && frameProgress && (
                  <div className="mt-1">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Frame {frameProgress.frame + 1} / {frameProgress.total}</span>
                      <span>{Math.round(((frameProgress.frame + 1) / frameProgress.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${((frameProgress.frame + 1) / frameProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {status === 'failed' && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
    </div>
  );
}
