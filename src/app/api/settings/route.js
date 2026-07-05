import { supabase } from '@/database/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) throw error;

    // Convert flat array of rows to a structured settings object
    const settingsObj = {};
    data.forEach(row => {
      settingsObj[row.key] = row.value;
    });

    // Fallback: Prefill using environment variables if database configuration is empty
    if (!settingsObj.telegram_config || !settingsObj.telegram_config.bot_token) {
      settingsObj.telegram_config = {
        bot_token: process.env.TELEGRAM_BOT_TOKEN || '',
        channel_id: process.env.TELEGRAM_CHANNEL_ID || ''
      };
    }
    if (!settingsObj.amazon_config || !settingsObj.amazon_config.tag || settingsObj.amazon_config.tag === 'your-amazon-tag-21') {
      settingsObj.amazon_config = {
        tag: process.env.AMAZON_TAG || 'your-amazon-tag-21',
        use_api: false
      };
    }
    if (!settingsObj.gemini_config || !settingsObj.gemini_config.api_key) {
      settingsObj.gemini_config = {
        api_key: process.env.GEMINI_API_KEY || ''
      };
    }
    if (!settingsObj.whatsapp_config) {
      settingsObj.whatsapp_config = {
        instance_id: '',
        api_token: '',
        chat_id: ''
      };
    }
    if (!settingsObj.flipkart_config) {
      settingsObj.flipkart_config = {
        affid: '',
        use_api: false
      };
    }
    if (!settingsObj.cuelinks_config) {
      settingsObj.cuelinks_config = {
        pub_id: ''
      };
    }
    if (!settingsObj.earnkaro_config) {
      settingsObj.earnkaro_config = {
        ref_id: ''
      };
    }
    if (!settingsObj.sourcing_channels) {
      settingsObj.sourcing_channels = ['lootalerts', 'desidimeloot'];
    }

    return NextResponse.json({
      success: true,
      settings: settingsObj
    });
  } catch (err) {
    console.error('[SettingsAPI GET] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { settings } = body; // Map of { key: value }

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings payload.' }, { status: 400 });
    }

    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString()
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('settings')
        .upsert(update, { onConflict: 'key' });
      
      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Settings successfully updated.'
    });
  } catch (err) {
    console.error('[SettingsAPI POST] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
