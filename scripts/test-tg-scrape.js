async function testTGScrape() {
  const channel = 'lootalerts'; // verified public deals channel
  const url = `https://t.me/s/${channel}`;
  console.log(`Fetching Telegram public web archive for channel: ${channel}...`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });
    const htmlText = await response.text();
    console.log(`HTML retrieved. Length: ${htmlText.length} bytes`);
    console.log('Response preview:', htmlText.substring(0, 1500));

    if (htmlText.includes('tgme_page_extra')) {
      console.log('✅ Connected to Telegram public preview successfully!');
    }

    // Match all Amazon links (both full and short amzn.to/amzn.in links)
    const amazonPattern = /https?:\/\/(?:www\.)?(?:amazon\.in|amzn\.to|amzn\.in)\/[^\s"'>]+/gi;
    const matches = htmlText.match(amazonPattern) || [];
    
    // Clean and filter duplicates
    const uniqueUrls = [...new Set(matches.map(link => {
      // Clean trailing punctuation or HTML entities
      return link.split('"')[0].split("'")[0].split(')')[0].replace(/&amp;/g, '&');
    }))];

    console.log(`\nFound ${uniqueUrls.length} unique Amazon URLs in the channel preview:`);
    uniqueUrls.slice(0, 10).forEach((link, idx) => {
      console.log(`[${idx + 1}] ${link}`);
    });

  } catch (err) {
    console.error('Failed to scrape Telegram channel:', err.message);
  }
}

testTGScrape();
