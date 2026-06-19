import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import ImageModel from '@/lib/models/Image';
import path from 'path';
import fs from 'fs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await connectDB();
    const userId = (session.user as { id: string }).id;
    const image = await ImageModel.findOne({ imageId: id, userId });

    if (!image) return NextResponse.json({ error: 'Image not found' }, { status: 404 });

    return NextResponse.json({ image });
  } catch (err) {
    console.error('[GET /api/images/[id]]', err);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await connectDB();
    const userId = (session.user as { id: string }).id;
    const image = await ImageModel.findOneAndDelete({ imageId: id, userId });

    if (!image) return NextResponse.json({ error: 'Image not found' }, { status: 404 });

    // Clean up file from disk
    try {
      const filePath = path.join(process.cwd(), 'uploads', image.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
      console.warn('[DELETE /api/images/[id]] File cleanup failed:', e);
    }

    return NextResponse.json({ message: 'Image deleted' });
  } catch (err) {
    console.error('[DELETE /api/images/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
