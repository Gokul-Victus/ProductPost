import { providerManager } from '@/modules/providers';
import { normalizeProduct } from '@/modules/providers/normalizer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL query parameter is required.' }, { status: 400 });
  }

  try {
    let store = '';
    
    // Identify store from URL
    if (url.includes('amazon.in') || url.includes('amazon.com') || url.includes('amzn.to') || url.includes('amzn.in')) {
      store = 'Amazon';
    } else if (url.includes('flipkart.com') || url.includes('fkrt.it') || url.includes('dl.flipkart.com')) {
      store = 'Flipkart';
    } else {
      return NextResponse.json({ error: 'Unsupported store URL. Only Amazon and Flipkart are supported.' }, { status: 400 });
    }

    // 1. Get corresponding provider
    const provider = providerManager.getProvider(store);

    // 2. Extract raw product details
    const rawDetails = await provider.extractProduct(url);

    // 3. Normalize product format
    const normalized = normalizeProduct(rawDetails, store);

    return NextResponse.json({
      success: true,
      store,
      product: normalized
    });

  } catch (err) {
    console.error(`[FetchMetadata] Error:`, err.message);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
