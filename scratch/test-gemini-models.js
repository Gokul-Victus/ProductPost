import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY is not set.');
    process.exit(1);
  }
  
  console.log('Testing API Key prefix:', apiKey.substring(0, 10) + '...');
  
  // Array of possible model names to probe
  const models = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro',
    'gemini-2.5-flash'
  ];
  
  for (const m of models) {
    try {
      console.log(`Testing model: "${m}"...`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent('Say Hello');
      console.log(`✅ Success with "${m}":`, result.response.text().trim());
      process.exit(0);
    } catch (e) {
      console.log(`❌ Failed with "${m}":`, e.message);
    }
  }
  
  console.log('All models failed to initialize.');
}

test();
