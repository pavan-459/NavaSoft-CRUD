'use client';

interface Props {
  uploadId: string;
}

export default function VideoPlayer({ uploadId }: Props) {
  return (
    <div className="bg-black rounded-xl overflow-hidden">
      <video
        controls
        className="w-full max-h-80 object-contain"
        src={`/api/videos/${uploadId}/stream`}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
