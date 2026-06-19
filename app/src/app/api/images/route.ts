import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import ImageModel from '@/lib/models/Image';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

const ML_SERVER = process.env.ML_SERVER_URL || 'http://localhost:5000';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const userId = (session.user as { id: string }).id;
    const images = await ImageModel.find({ userId }).sort({ createdAt: -1 });
    return NextResponse.json({ images });
  } catch (err) {
    console.error('[GET /api/images]', err);
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
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

    const file = formData.get('image') as File | null;
    if (!file) return NextResponse.json({ error: 'No image file provided' }, { status: 400 });

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images are allowed' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Image must be under 10 MB' }, { status: 400 });
    }

    const imageId = uuidv4();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${imageId}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'uploads');

    fs.mkdirSync(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // Run detection synchronously — images are fast (< 2s on CPU)
    const base64 = buffer.toString('base64');
    let objects: unknown[] = [];
    try {
      const response = await axios.post(`${ML_SERVER}/detect`, { image: base64 }, { timeout: 30000 });
      objects = response.data.objects || [];
    } catch (err) {
      if (axios.isAxiosError(err) && err.code === 'ECONNREFUSED') {
        // Clean up saved file before returning error
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
        return NextResponse.json(
          { error: 'ML server is not running. Start it with: python app.py' },
          { status: 503 }
        );
      }
      console.warn('[POST /api/images] Detection failed, storing with empty results:', err);
    }

    await connectDB();
    const userId = (session.user as { id: string }).id;

    const image = await ImageModel.create({
      imageId,
      filename,
      originalName: file.name,
      mimeType: file.type,
      userId,
      objects,
    });

    return NextResponse.json({ image }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/images]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
