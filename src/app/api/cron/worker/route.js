import { executeWorker } from '@/modules/queue/worker.js';
import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { supabase } from '@/database/supabase.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  noStore();
  const startedAt = new Date();
  
  // Security secret validation
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const expectedSecret = process.env.CRON_SECRET || 'local-secret-123';
  
  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const host = request.headers.get('host') || 'lootsyncs.vercel.app';
    const result = await executeWorker({ host });

    // Log cron run to DB
    await supabase.from('job_logs').insert({
      job_name: 'queue_worker',
      status: result.itemsFailed > 0 ? 'warning' : 'success',
      duration_ms: result.durationMs,
      items_processed: result.itemsProcessed,
      error_message: result.logs ? result.logs.join('\n') : null,
      started_at: startedAt.toISOString(),
      completed_at: new Date().toISOString()
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[WorkerRoute] Global failure:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
