'use client';

import { useEffect, useRef, useState } from 'react';

interface DetectionObject {
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
}

interface DetectionResult {
  frameIndex: number;
  timestamp: number;
  objects: DetectionObject[];
}

interface Props {
  results: DetectionResult[];
}

export default function ResultsViewer({ results }: Props) {
  const [selectedFrame, setSelectedFrame] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const frame = results[selectedFrame];

  // Draw bounding boxes on canvas whenever frame changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frame) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    frame.objects.forEach((obj) => {
      const [x, y, w, h] = obj.bbox;
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
      const color = colors[frame.objects.indexOf(obj) % colors.length];

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = color;
      ctx.fillRect(x, y - 20, w, 20);

      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.fillText(`${obj.label} ${(obj.confidence * 100).toFixed(0)}%`, x + 4, y - 5);
    });
  }, [frame]);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'detection-results.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!results.length) {
    return <p className="text-gray-500 text-sm">No results yet.</p>;
  }

  const allObjects = results.flatMap((r) => r.objects);
  const uniqueLabels = [...new Set(allObjects.map((o) => o.label))];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-blue-700">{results.length}</p>
          <p className="text-sm text-blue-600">Frames analyzed</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-700">{allObjects.length}</p>
          <p className="text-sm text-green-600">Objects detected</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4">
          <p className="text-2xl font-bold text-purple-700">{uniqueLabels.length}</p>
          <p className="text-sm text-purple-600">Unique labels</p>
        </div>
      </div>

      {/* Timeline */}
      <div>
        <h4 className="font-medium text-gray-700 mb-2">Timeline</h4>
        <div className="flex gap-1 overflow-x-auto pb-2">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => setSelectedFrame(i)}
              className={`shrink-0 w-10 h-10 rounded text-xs font-medium transition-colors
                ${i === selectedFrame ? 'bg-blue-600 text-white' :
                r.objects.length > 0 ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              title={`${r.timestamp}s — ${r.objects.length} objects`}
            >
              {r.timestamp}s
            </button>
          ))}
        </div>
      </div>

      {/* Frame detail */}
      {frame && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Frame at {frame.timestamp}s</h4>
            <canvas
              ref={canvasRef}
              width={480}
              height={270}
              className="w-full rounded-lg border border-gray-200"
            />
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Detections ({frame.objects.length})</h4>
            {frame.objects.length === 0 ? (
              <p className="text-sm text-gray-400">No objects detected in this frame.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {frame.objects.map((obj, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium text-gray-800">{obj.label}</span>
                    <span className="text-sm text-gray-500">{(obj.confidence * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export */}
      <button
        onClick={exportJSON}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export JSON
      </button>
    </div>
  );
}
