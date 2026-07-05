import { enqueueProduct } from '@/modules/queue/manager';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    
    const { 
      externalId, 
      store, 
      title, 
      imageUrl, 
      originalPrice, 
      salePrice, 
      rating, 
      rawUrl,
      channels = ['telegram']
    } = body;

    if (!externalId || !store || !title || !rawUrl) {
      return NextResponse.json({ error: 'Missing required product fields (externalId, store, title, rawUrl).' }, { status: 400 });
    }

    // Call Queue Manager to register and enqueue
    const result = await enqueueProduct({
      externalId,
      store,
      title,
      imageUrl,
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      salePrice: salePrice ? parseFloat(salePrice) : null,
      rating: rating ? parseFloat(rating) : null,
      rawUrl
    }, channels);

    return NextResponse.json({
      success: true,
      message: 'Product successfully registered and enqueued for publishing.',
      ...result
    });

  } catch (err) {
    console.error(`[ManualPostAPI] Error:`, err.message);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
