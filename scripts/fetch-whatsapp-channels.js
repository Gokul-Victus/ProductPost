import 'dotenv/config';

const instanceId = process.env.WHATSAPP_INSTANCE_ID || '710701672951';
const apiToken = process.env.WHATSAPP_API_TOKEN || '';
const apiBase = `https://${instanceId.substring(0, 4)}.api.greenapi.com/waInstance${instanceId}`;

async function run() {
  if (!apiToken) {
    console.error('Error: WHATSAPP_API_TOKEN environment variable is not set.');
    process.exit(1);
  }

  console.log('Querying last outgoing messages...');
  
  try {
    const response = await fetch(`${apiBase}/lastOutgoingMessages/${apiToken}`);
    if (response.ok) {
      const data = await response.json();
      console.log('\n--- Recent Outgoing Messages ---');
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((msg, idx) => {
          console.log(`\n[Message ${idx + 1}]`);
          console.log(`Recipient ID (chatId): ${msg.chatId}`);
          console.log(`Message Text: ${msg.textMessage || '(Media/Document)'}`);
          console.log(`Status: ${msg.statusMessage || 'unknown'}`);
        });
      } else {
        console.log('No outgoing messages found in the logs.');
      }
    } else {
      console.log(`lastOutgoingMessages failed: ${response.status}`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
