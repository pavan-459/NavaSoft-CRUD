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
    const image = await ImageModel.findOne({ imageId: id, userId }).select('filename mimeType');

    if (!image) return NextResponse.json({ error: 'Image not found' }, { status: 404 });

    const filePath = path.join(process.cwd(), 'uploads', image.filename);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Image file not found on disk' }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': image.mimeType,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[GET /api/images/[id]/file]', err);
    return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 });
  }
}
