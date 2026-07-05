import { publishToWhatsApp } from '../src/modules/publisher/channels/whatsapp.js';
import { generateAIDealMessage } from '../src/modules/ai/description.js';

async function run() {
  console.log('Generating AI caption for test deal...');
  
  const product = {
    title: 'Bajaj Pulsar 125 Neon Disc Bike Ebony Black Racing Red Booking for Ex-Showroom Price',
    store: 'Amazon',
    originalPrice: '106407',
    salePrice: '89757',
    rating: '4.2',
    mrp: '106407',
    price: '89757'
  };
  
  const affiliateUrl = 'https://amazon.in/dp/B07XB3D7P4?tag=smartdealsgo-21';
  
  const caption = await generateAIDealMessage(product, affiliateUrl);
  console.log('\n--- Generated Caption ---');
  console.log(caption);
  console.log('-------------------------\n');
  
  console.log('Sending message to WhatsApp Group...');
  try {
    const result = await publishToWhatsApp({
      title: product.title,
      imageUrl: 'https://m.media-amazon.com/images/I/71tT3bI2sQL._SL1500_.jpg',
      affiliateUrl: affiliateUrl,
      formattedContent: caption
    });
    
    console.log('\n✔ Test message sent successfully!');
    console.log('Message ID:', result.messageId);
  } catch (err) {
    console.error('Error sending message:', err.message);
  }
}

run();
