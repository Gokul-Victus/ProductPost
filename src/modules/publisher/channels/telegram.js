import { supabase } from '../../../database/supabase.js';

/**
 * Publishes a deal directly to a Telegram channel.
 * Uses HTML parse mode for robust text formatting.
 * @param {Object} params - Publication parameters.
 * @param {string} params.title - Product title.
 * @param {string} [params.imageUrl] - Product image URL.
 * @param {string} params.affiliateUrl - Affiliate tracking link.
 * @param {string} params.formattedContent - HTML-formatted message text.
 * @returns {Promise<Object>} Object containing Telegram message ID.
 */
export async function publishToTelegram({ title, imageUrl, affiliateUrl, formattedContent }) {
  // 1. Fetch credentials from settings table
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'telegram_config')
    .single();

  if (error || !data || !data.value) {
    throw new Error('[TelegramPublisher] Bot config is not found in settings.');
  }

  const { bot_token, channel_id } = data.value;
  if (!bot_token || !channel_id) {
    throw new Error('[TelegramPublisher] Bot Token or Channel ID is missing in database settings.');
  }

  const method = imageUrl ? 'sendPhoto' : 'sendMessage';
  const telegramUrl = `https://api.telegram.org/bot${bot_token}/${method}`;

  // Formulate payload.
  // HTML parse mode allows simple tags: <b>, <i>, <s>, <a>
  const payload = imageUrl
    ? {
        chat_id: channel_id,
        photo: imageUrl,
        caption: formattedContent || `<b>${title}</b>\n\n🛒 <b>Buy Now:</b> ${affiliateUrl}`,
        parse_mode: 'HTML'
      }
    : {
        chat_id: channel_id,
        text: formattedContent || `<b>${title}</b>\n\n🛒 <b>Buy Now:</b> ${affiliateUrl}`,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      };

  try {
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const resData = await response.json();
    if (!response.ok || !resData.ok) {
      // If photo sending failed (e.g. bad image URL), fallback to a text-only message
      if (imageUrl) {
        console.warn(`[TelegramPublisher] Photo send failed: "${resData.description}". Falling back to text-only.`);
        const textUrl = `https://api.telegram.org/bot${bot_token}/sendMessage`;
        const textPayload = {
          chat_id: channel_id,
          text: formattedContent || `<b>${title}</b>\n\n🛒 <b>Buy Now:</b> ${affiliateUrl}`,
          parse_mode: 'HTML',
          disable_web_page_preview: false
        };
        const textResponse = await fetch(textUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(textPayload)
        });
        const textResData = await textResponse.json();
        if (textResponse.ok && textResData.ok) {
          return {
            messageId: String(textResData.result.message_id)
          };
        }
      }
      throw new Error(resData.description || `Telegram HTTP ${response.status}`);
    }

    return {
      messageId: String(resData.result.message_id)
    };
  } catch (err) {
    throw new Error(`[TelegramPublisher] Failed to post: ${err.message}`);
  }
}

/**
 * Sends a system alert to the admin's personal Telegram Chat ID, with a 60-minute cooldown.
 * @param {string} text - Message text to send.
 * @param {string} type - Unique alert type key for cooldown tracking.
 */
export async function sendAdminAlert(text, type = 'general') {
  try {
    const { data: tgData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'telegram_config')
      .single();

    if (!tgData || !tgData.value) return;
    const { bot_token, admin_chat_id } = tgData.value;
    if (!bot_token || !admin_chat_id) {
      console.warn('[AdminAlert] Bot token or admin_chat_id is missing in settings.');
      return;
    }

    const cooldownKey = `alert_cooldown_${type}`;
    const { data: cooldownData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'alert_cooldowns')
      .maybeSingle();

    const cooldowns = cooldownData?.value || {};
    const lastSent = cooldowns[cooldownKey];
    const now = new Date();

    if (lastSent && (now.getTime() - new Date(lastSent).getTime()) < 60 * 60 * 1000) {
      console.log(`[AdminAlert] Cooldown active for type "${type}". Skipped alert.`);
      return;
    }

    const telegramUrl = `https://api.telegram.org/bot${bot_token}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: admin_chat_id,
        text: `⚠️ <b>[LootSyncs Status Alert]</b>\n\n${text}`,
        parse_mode: 'HTML'
      })
    });

    if (response.ok) {
      cooldowns[cooldownKey] = now.toISOString();
      await supabase
        .from('settings')
        .upsert({
          key: 'alert_cooldowns',
          value: cooldowns,
          updated_at: now.toISOString()
        });
      console.log(`[AdminAlert] Sent alert: "${text}"`);
    } else {
      console.error('[AdminAlert] Telegram API response not OK:', response.status);
    }
  } catch (err) {
    console.error('[AdminAlert] Failed to send admin alert:', err.message);
  }
}
