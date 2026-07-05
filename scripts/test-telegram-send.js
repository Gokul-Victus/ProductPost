import { publishToTelegram } from '../src/modules/publisher/channels/telegram.js';

async function run() {
  const product = {
    title: 'Bajaj Ninja Series Powergrind Mixer Grinder With 3 Jars (1000W Motor)',
    store: 'Amazon',
    originalPrice: '10590',
    salePrice: '5307',
    rating: '4.2',
    mrp: '10590',
    price: '5307'
  };
  
  const affiliateUrl = 'https://amazon.in/dp/B0BYN5T73F?tag=smartdealsgo-21';
  
  const caption = `🔥 <b>Deal of the Day!</b>\n\n<b>${product.title}</b>\n\n💰 Price: <s>₹10,590</s> ➜ <b>₹5,307</b>\n⚡ Discount: <b>50% OFF</b>\n⭐ Rating: <b>4.2 / 5</b>\n\n✅ Double Ball Bearing 1000W Motor\n✅ DuraCut Blades For Lifetime Grinding\n\n🛒 <b>Grab It Now on Amazon:</b> ${affiliateUrl}`;
  
  console.log('Sending message to Telegram Channel @LootSyncs...');
  try {
    const result = await publishToTelegram({
      title: product.title,
      imageUrl: 'https://m.media-amazon.com/images/I/71u9fKx8rFL._SL1500_.jpg',
      affiliateUrl: affiliateUrl,
      formattedContent: caption
    });
    
    console.log('\n✔ Test message sent to Telegram successfully!');
    console.log('Message ID:', result.messageId);
  } catch (err) {
    console.error('Error sending message to Telegram:', err.message);
  }
}

run();
