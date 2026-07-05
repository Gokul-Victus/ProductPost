function parseDealFromTelegramPost(text, rawUrl, image) {
  if (!text) return null;
  
  const cleanText = text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
    
  // 1. Extract Price
  let price = null;
  const priceMatch = cleanText.match(/(?:@|\bat\b|Rs\.?|₹)\s*(?:Rs\.?|₹)?\s*([0-9,]+)/i);
  if (priceMatch) {
    price = parseFloat(priceMatch[1].replace(/,/g, ''));
  }
  
  // 2. Extract MRP
  let mrp = null;
  const mrpMatch = cleanText.match(/MRP\s*(?::|₹|\s)?\s*([0-9,]+)/i);
  if (mrpMatch) {
    mrp = parseFloat(mrpMatch[1].replace(/,/g, ''));
  }

  // 3. Extract Title (text before the price separator)
  let title = '';
  const separatorMatch = cleanText.match(/(.*?)(?:@|\bat\b|Rs\.?|₹)/i);
  if (separatorMatch && separatorMatch[1].trim()) {
    title = separatorMatch[1].trim();
  } else {
    title = cleanText.split('\n')[0].trim();
  }
  
  // Clean up title emojis and links
  title = title
    .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    title: title || 'Discounted Product',
    price: price,
    mrp: mrp || price,
    image: image || 'https://m.media-amazon.com/images/I/31W%2Bq%2BCXyOL.jpg'
  };
}

const samples = [
  {
    text: "Fire-Boltt Elemento 1.95&quot; Full IPS Touch Screen Smartwatch @ 967/-👉🏻https://www.amazon.in/dp/B0CH8MRLT2?th=1&amp;tag=i98-21",
    image: "https://cdn5.telesco.pe/file/photo1.jpg"
  },
  {
    text: "Dabur Vatika Health Shampoo - 1 Ltr @ 279/- (MRP: 999)👉🏻https://www.amazon.in/dp/B092LXV199?th=1&amp;tag=i98-21",
    image: "https://cdn5.telesco.pe/file/photo2.jpg"
  },
  {
    text: "Bajaj Pulsar 125 Neon Disc Bike @ 76,005/- (MRP: 88,146)👉🏻https://www.amazon.in/dp/B0GZ4823BQ?th=1&amp;tag=i98-21Pay Using SBI/AXIS CC",
    image: "https://cdn5.telesco.pe/file/photo3.jpg"
  }
];

for (const sample of samples) {
  const result = parseDealFromTelegramPost(sample.text, '', sample.image);
  console.log('\nInput:', sample.text);
  console.log('Parsed Output:', JSON.stringify(result, null, 2));
}
