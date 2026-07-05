import { supabase } from '../../../database/supabase.js';
import { sendAdminAlert } from './telegram.js';
import sharp from 'sharp';

/**
 * Publishes a deal directly to a WhatsApp group, chat, or channel using Green API.
 * @param {Object} params - Publication parameters.
 * @param {string} params.title - Product title.
 * @param {string} [params.imageUrl] - Product image URL.
 * @param {string} params.affiliateUrl - Affiliate tracking link.
 * @param {string} params.formattedContent - HTML-formatted message text.
 * @returns {Promise<Object>} Object containing message ID.
 */
export async function publishToWhatsApp({ title, imageUrl, affiliateUrl, formattedContent }) {
  // 1. Fetch credentials from settings table
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'whatsapp_config')
    .single();

  if (error || !data || !data.value) {
    throw new Error('[WhatsAppPublisher] Bot config is not found in settings.');
  }

  const { instance_id, api_token, chat_id } = data.value;
  if (!instance_id || !api_token || !chat_id) {
    throw new Error('[WhatsAppPublisher] Instance ID, API Token, or Chat ID is missing in database settings.');
  }

  // 2. Fetch image configuration
  const { data: imgConfig } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'image_config')
    .maybeSingle();
  const maxWidth = imgConfig?.value?.max_width || 800;

  // Convert HTML tags to plain text for WhatsApp formatting
  let textContent = formattedContent || `*${title}*\n\n🛒 Buy Now: ${affiliateUrl}`;
  textContent = textContent
    .replace(/<b>(.*?)<\/b>/gi, '*$1*')
    .replace(/<strong>(.*?)<\/strong>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '_$1_')
    .replace(/<em>(.*?)<\/em>/gi, '_$1_')
    .replace(/<s>(.*?)<\/s>/gi, '~$1~')
    .replace(/<strike>(.*?)<\/strike>/gi, '~$1~')
    .replace(/<a href="([^"]+)">(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<br\s*\/?>/gi, '\n');

  // Strip any remaining HTML tags
  textContent = textContent.replace(/<[^>]*>/g, '');

  let cleanImageUrl = null;
  if (imageUrl) {
    const cluster = instance_id.toString().substring(0, 4);
    const host = `https://${cluster}.api.greenapi.com`;
    
    try {
      console.log(`[WhatsAppPublisher] Downloading and resizing image: ${imageUrl}`);
      const imgRes = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
      });
      
      if (imgRes.status === 200) {
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Resize and compress
        const sharpImg = sharp(buffer);
        const meta = await sharpImg.metadata();
        
        let processedBuffer;
        if (meta.width && meta.width > maxWidth) {
          processedBuffer = await sharpImg
            .resize({ width: maxWidth, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
        } else {
          processedBuffer = await sharpImg
            .jpeg({ quality: 80 })
            .toBuffer();
        }
        
        // Upload to Green API hosted storage
        const uploadUrl = `${host}/waInstance${instance_id}/uploadFile/${api_token}`;
        const formData = new FormData();
        const processedBlob = new Blob([processedBuffer], { type: 'image/jpeg' });
        formData.append('file', processedBlob, 'deal_image.jpg');
        
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          body: formData
        });
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          if (uploadResult.urlFile) {
            cleanImageUrl = uploadResult.urlFile;
            console.log(`[WhatsAppPublisher] Successfully uploaded resized image to Green API: ${cleanImageUrl}`);
          }
        } else {
          console.warn(`[WhatsAppPublisher] Upload to Green API failed: ${uploadResponse.status}`);
        }
      } else {
        console.warn(`[WhatsAppPublisher] Image download returned non-200 status (${imgRes.status}). Dropping image.`);
      }
    } catch (e) {
      console.warn(`[WhatsAppPublisher] Failed to process/upload image: ${e.message}. Dropping image.`);
    }
  }

  const isPhoto = cleanImageUrl !== null;
  const method = isPhoto ? 'sendFileByUrl' : 'sendMessage';
  const cluster = instance_id.toString().substring(0, 4);
  const host = `https://${cluster}.api.greenapi.com`;
  const url = `${host}/waInstance${instance_id}/${method}/${api_token}`;

  const payload = isPhoto
    ? {
        chatId: chat_id,
        urlFile: cleanImageUrl,
        fileName: 'deal_image.jpg',
        caption: textContent
      }
    : {
        chatId: chat_id,
        message: textContent
      };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const resData = await response.json();
    if (!response.ok || !resData || !resData.idMessage) {
      throw new Error(resData?.description || resData?.message || `Green API HTTP ${response.status}`);
    }

    // Increment and reset Green API daily count
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: usageData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'whatsapp_usage')
        .maybeSingle();

      let usage = usageData?.value || { date: today, count: 0 };
      if (usage.date === today) {
        usage.count += 1;
      } else {
        usage.date = today;
        usage.count = 1;
      }

      await supabase
        .from('settings')
        .upsert({
          key: 'whatsapp_usage',
          value: usage,
          updated_at: new Date().toISOString()
        });

      if (usage.count >= 90) {
        await sendAdminAlert(`Green API daily message usage has reached ${usage.count}/100. Check free tier limits!`, 'whatsapp_limit');
      }
    } catch (countErr) {
      console.warn('[WhatsAppPublisher] Failed to update usage logs:', countErr.message);
    }

    return {
      messageId: resData.idMessage
    };
  } catch (err) {
    console.error('[WhatsAppPublisher] Error sending message via Green API:', err.message);
    throw err;
  }
}
