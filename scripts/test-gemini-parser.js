import { generateContent } from '../src/modules/ai/gemini.js';

const samples = [
  "Fire-Boltt Elemento 1.95\" Full IPS Touch Screen Smartwatch @ 967/-👉🏻https://www.amazon.in/dp/B0CH8MRLT2?th=1&amp;tag=i98-21",
  "Dabur Vatika Health Shampoo - 1 Ltr @ 279/- (MRP: 999)👉🏻https://www.amazon.in/dp/B092LXV199?th=1&amp;tag=i98-21",
  "Bajaj Pulsar 125 Neon Disc Bike @ 76005/- (MRP: 88146)👉🏻https://www.amazon.in/dp/B0GZ4823BQ?th=1&amp;tag=i98-21Pay Using SBI/AXIS CC"
];

async function run() {
  const jsonSchema = {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      price: { type: "NUMBER" },
      mrp: { type: "NUMBER" },
      rating: { type: "NUMBER" }
    },
    required: ["title", "price", "mrp", "rating"]
  };

  for (const sample of samples) {
    console.log(`\nOriginal Message:\n"${sample}"`);
    
    const prompt = `You are a helper that extracts structured product details from a deals channel message.
Message: "${sample}"

Extract the details and return them according to the schema.`;

    try {
      const response = await generateContent(prompt, jsonSchema);
      console.log('Gemini Parsed Output:');
      console.log(response);
    } catch (e) {
      console.error('Error calling Gemini:', e.message);
    }
  }
}

run();
