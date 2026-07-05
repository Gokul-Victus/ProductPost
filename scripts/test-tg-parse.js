async function run() {
  console.log('Fetching LootSyncs channel updates...');
  try {
    const response = await fetch('https://t.me/s/LootSyncs', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });
    const html = await response.text();

    const messageBlocks = html.split('class="tgme_widget_message_wrap');
    console.log(`Found ${messageBlocks.length - 1} messages on your channel.`);
    
    for (let i = Math.max(1, messageBlocks.length - 3); i < messageBlocks.length; i++) {
      const block = messageBlocks[i];
      const textMatch = block.match(/class="tgme_widget_message_text[^>]*>([^]+?)<\/div>/i);
      const text = textMatch ? textMatch[1].replace(/<[^>]*>/g, '').trim() : 'No Text';
      
      console.log(`\n--- Message ${i} ---`);
      console.log(text);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
