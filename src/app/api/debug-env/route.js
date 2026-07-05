import { supabase } from '@/database/supabase.js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret !== 'diagnose-123-xyz') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check which keys are defined
  const envKeys = {
    SUPABASE_URL_defined: !!process.env.SUPABASE_URL,
    SUPABASE_URL_length: process.env.SUPABASE_URL?.length || 0,
    SUPABASE_URL_start: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 15) : 'none',
    
    NEXT_PUBLIC_SUPABASE_URL_defined: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL_length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
    NEXT_PUBLIC_SUPABASE_URL_value: process.env.NEXT_PUBLIC_SUPABASE_URL || 'none',
    
    SUPABASE_SERVICE_ROLE_KEY_defined: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY_length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
    
    TELEGRAM_BOT_TOKEN_defined: !!process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_BOT_TOKEN_length: process.env.TELEGRAM_BOT_TOKEN?.length || 0,
    
    CRON_SECRET_defined: !!process.env.CRON_SECRET,
    CRON_SECRET_length: process.env.CRON_SECRET?.length || 0,
    
    NODE_ENV: process.env.NODE_ENV || 'undefined'
  };

  // Test Supabase connection state and fetch pending jobs
  let supabaseState = 'unknown';
  let pendingJobsInDb = [];
  try {
    const { data: settingsData, error: settingsError } = await supabase.from('settings').select('key').limit(1);
    if (settingsError) {
      supabaseState = `error: ${settingsError.message}`;
    } else {
      supabaseState = `connected, settings count: ${settingsData.length}`;
      
      const { data: queueData, error: queueError } = await supabase
        .from('publisher_queue')
        .select('id, product_id, status')
        .eq('status', 'pending');
        
      if (!queueError) {
        pendingJobsInDb = queueData || [];
      } else {
        supabaseState += ` (queue error: ${queueError.message})`;
      }
    }
  } catch (e) {
    supabaseState = `exception: ${e.message}`;
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    envKeys,
    supabaseState,
    pendingJobsInDb
  });
}
