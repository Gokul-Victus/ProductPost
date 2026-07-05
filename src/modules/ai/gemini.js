import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../../database/supabase.js';

let genAIInstance = null;

/**
 * Initializes and returns the Gemini GenAI model instance.
 * Resolves the API key from environment variables or settings table.
 * @returns {Promise<Object|null>} The Gemini model instance or null if unconfigured.
 */
export async function getGeminiModel() {
  if (genAIInstance) {
    return genAIInstance.getGenerativeModel({ model: 'gemini-3.5-flash' });
  }

  let apiKey = process.env.GEMINI_API_KEY;

  // Try loading from settings table if env is missing
  if (!apiKey) {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'gemini_config')
        .single();

      if (!error && data && data.value && data.value.api_key) {
        apiKey = data.value.api_key;
      }
    } catch (err) {
      console.warn('[GeminiClient] Could not fetch API key from database settings:', err.message);
    }
  }

  if (!apiKey) {
    console.warn('[GeminiClient] Gemini API Key is not configured. AI operations will be bypassed.');
    return null;
  }

  try {
    genAIInstance = new GoogleGenerativeAI(apiKey);
    return genAIInstance.getGenerativeModel({ model: 'gemini-3.5-flash' });
  } catch (err) {
    console.error('[GeminiClient] Failed to initialize GoogleGenAI:', err.message);
    return null;
  }
}

/**
 * Helper to run a Gemini generation prompt safely with fallbacks.
 * @param {string} prompt - Prompt instruction text.
 * @param {Object} [jsonSchema] - Optional JSON response schema constraint.
 * @returns {Promise<string|null>} The generated text response.
 */
export async function generateContent(prompt, jsonSchema = null) {
  const model = await getGeminiModel();
  if (!model) return null;

  try {
    const generationConfig = jsonSchema 
      ? {
          responseMimeType: 'application/json',
          responseSchema: jsonSchema
        }
      : {};

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig
    });

    const response = await result.response;
    return response.text();
  } catch (err) {
    console.error('[GeminiClient] Generation failed:', err.message);
    return null;
  }
}
