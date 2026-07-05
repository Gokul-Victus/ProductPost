import { supabase } from '@/database/supabase.js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // 1. Verify shared secret authentication token
    const token = request.headers.get('x-heartbeat-token') || new URL(request.url).searchParams.get('token');
    const expectedToken = process.env.HEARTBEAT_SECRET;

    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();

    // 2. Save heartbeat timestamp to database settings
    const { error } = await supabase
      .from('settings')
      .upsert({
        key: 'macrodroid_heartbeat',
        value: { timestamp: now },
        updated_at: now
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, timestamp: now });
  } catch (err) {
    console.error('[HeartbeatAPI] Failure:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
