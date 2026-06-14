import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Video from '@/lib/models/Video';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing video ID' }, { status: 400 });

    await connectDB();
    const userId = (session.user as { id: string }).id;
    const video = await Video.findOne({ uploadId: id, userId });

    if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });

    return NextResponse.json({ video });
  } catch (err) {
    console.error('[GET /api/videos/[id]]', err);
    return NextResponse.json({ error: 'Failed to fetch video' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing video ID' }, { status: 400 });

    await connectDB();
    const userId = (session.user as { id: string }).id;
    const video = await Video.findOneAndDelete({ uploadId: id, userId });

    if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });

    return NextResponse.json({ message: 'Video deleted successfully' });
  } catch (err) {
    console.error('[DELETE /api/videos/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 });
  }
}
