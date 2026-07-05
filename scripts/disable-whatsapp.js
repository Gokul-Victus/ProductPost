import { supabase } from '../src/database/supabase.js';

async function disable() {
  console.log('Disabling WhatsApp API publisher in Supabase settings...');
  
  const { data: flagsData } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'feature_flags')
    .single();

  const currentFlags = flagsData?.value || {};
  const { error: errFlags } = await supabase
    .from('settings')
    .upsert({
      key: 'feature_flags',
      value: {
        ...currentFlags,
        enable_whatsapp: false
      },
      updated_at: new Date().toISOString()
    });

  if (errFlags) {
    console.error('Failed to update feature_flags:', errFlags.message);
    return;
  }
  console.log('✔ WhatsApp Publisher API disabled successfully!');
}

disable();
