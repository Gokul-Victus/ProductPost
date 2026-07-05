import { publishToTelegram } from '../src/modules/publisher/channels/telegram.js';
import { publishToWhatsApp } from '../src/modules/publisher/channels/whatsapp.js';

async function run() {
  const product = {
    title: 'Samsung Galaxy M34 5G (Prism Blue, 6GB, 128GB Storage)',
    store: 'Amazon',
    originalPrice: '24499',
    salePrice: '15999',
    rating: '4.1',
    mrp: '24499',
    price: '15999'
  };
  
  const affiliateUrl = 'https://amazon.in/dp/B0C7CS2GGB?tag=smartdealsgo-21';
  
  const caption = `🔥 <b>Samsung Galaxy M34 5G Price Drop!</b>\n\n<b>${product.title}</b>\n\n💰 Price: <s>₹24,499</s> ➜ <b>₹15,999</b>\n⚡ Discount: <b>35% OFF</b>\n⭐ Rating: <b>4.1 / 5</b>\n\n✅ 50MP No Shake Cam & 6000mAh Battery\n✅ 120Hz Super AMOLED Display\n\n🛒 <b>Grab It Now on Amazon:</b> ${affiliateUrl}`;
  
  console.log('Sending to Telegram Channel...');
  try {
    const resultTg = await publishToTelegram({
      title: product.title,
      imageUrl: 'https://m.media-amazon.com/images/I/81792v-kXVL._SL1500_.jpg',
      affiliateUrl: affiliateUrl,
      formattedContent: caption
    });
    console.log('✔ Sent to Telegram! ID:', resultTg.messageId);
  } catch (err) {
    console.error('Telegram failed:', err.message);
  }

  console.log('\nSending to WhatsApp Group...');
  try {
    const resultWa = await publishToWhatsApp({
      title: product.title,
      imageUrl: 'https://m.media-amazon.com/images/I/81792v-kXVL._SL1500_.jpg',
      affiliateUrl: affiliateUrl,
      formattedContent: caption
    });
    console.log('✔ Sent to WhatsApp Group! ID:', resultWa.messageId);
  } catch (err) {
    console.error('WhatsApp failed:', err.message);
  }
}

run();
