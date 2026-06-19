import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Video from '@/lib/models/Video';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { processVideo } from '@/lib/videoProcessor';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const userId = (session.user as { id: string }).id;
    const videos = await Video.find({ userId }).sort({ createdAt: -1 });
    return NextResponse.json({ videos });
  } catch (err) {
    console.error('[GET /api/videos]', err);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = formData.get('video') as File | null;
    if (!file) return NextResponse.json({ error: 'No video file provided' }, { status: 400 });

    const allowed = ['video/mp4', 'video/quicktime'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Only MP4 and MOV files are allowed' }, { status: 400 });
    }
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be under 100MB' }, { status: 400 });
    }

    const uploadId = uuidv4();
    const ext = file.name.split('.').pop() || 'mp4';
    const filename = `${uploadId}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'uploads');

    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch {
      return NextResponse.json({ error: 'Failed to create upload directory' }, { status: 500 });
    }

    const filePath = path.join(uploadDir, filename);

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
    } catch {
      return NextResponse.json({ error: 'Failed to save video file' }, { status: 500 });
    }

    await connectDB();
    const userId = (session.user as { id: string }).id;

    await Video.create({
      uploadId,
      filename,
      originalName: file.name,
      status: 'pending',
      userId,
      results: [],
    });

    // Fire-and-forget — errors are caught inside processVideo and saved to DB
    processVideo(uploadId, filePath).catch((err) => {
      console.error(`[processVideo] Unhandled error for ${uploadId}:`, err);
    });

    return NextResponse.json({ uploadId, message: 'Video uploaded successfully' }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/videos]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
