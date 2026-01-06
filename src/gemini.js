import { GoogleGenerativeAI } from '@google/generative-ai';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import config from '../config.js';

let genAI = null;
let model = null;

/**
 * Initialize Gemini client
 */
export function initGemini() {
  console.log('   → Checking for GEMINI_API_KEY environment variable...');
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  
  console.log(`   → API key found (${apiKey.slice(0, 8)}...${apiKey.slice(-4)})`);
  console.log(`   → Initializing GoogleGenerativeAI client...`);
  
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: config.geminiModel });
  
  console.log(`   ✓ Gemini initialized with model: ${config.geminiModel}`);
}

/**
 * Get existing category folders from the vault
 * @returns {string[]} List of existing folder names
 */
export function getExistingCategories() {
  const bookmarksPath = join(config.vaultPath, config.bookmarksFolder);
  
  try {
    const entries = readdirSync(bookmarksPath);
    const folders = entries.filter(entry => {
      const fullPath = join(bookmarksPath, entry);
      return statSync(fullPath).isDirectory() && !entry.startsWith('.');
    });
    return folders;
  } catch (error) {
    return [];
  }
}

/**
 * Categorize a batch of tweets using a single Gemini request
 * @param {Array} tweets - Array of tweet objects
 * @param {string[]} existingCategories - List of existing category folders
 * @returns {Map<string, string>} Map of tweet ID to category
 */
export async function categorizeBatch(tweets, existingCategories) {
  const existingList = existingCategories.length > 0 
    ? `\nExisting categories (prefer these if they fit well):\n${existingCategories.map(c => `- ${c}`).join('\n')}`
    : '';

  // Build tweet list for the prompt
  const tweetList = tweets.map((tweet, i) => {
    const text = (tweet.text || '').slice(0, 300).replace(/\n/g, ' ');
    return `[${i + 1}] ID: ${tweet.id}
Author: @${tweet.author?.username || 'unknown'}
Text: "${text}"`;
  }).join('\n\n');

  const prompt = `You are categorizing Twitter bookmarks for organization in a notes vault.

TWEETS TO CATEGORIZE:
${tweetList}
${existingList}

RULES:
1. If an existing category fits well, use it EXACTLY as written
2. If no existing category fits, create a NEW concise category (2-4 words max)
3. Focus on the main TOPIC/THEME (e.g., "AI Development", "Swift Packages", "Startup Advice")
4. Use Title Case for category names
5. Be specific enough to be useful, but general enough to group similar content

RESPOND WITH ONLY A JSON OBJECT mapping tweet IDs to categories, like:
{"${tweets[0]?.id}": "Category Name", "${tweets[1]?.id || 'id2'}": "Another Category"}

JSON response:`;

  const startTime = Date.now();
  
  try {
    const result = await model.generateContent(prompt);
    const elapsed = Date.now() - startTime;
    
    let response = result.response.text().trim();
    console.log(`      → Gemini responded in ${elapsed}ms`);
    
    // Clean up response - extract JSON if wrapped in markdown
    if (response.startsWith('```')) {
      response = response.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    }
    
    // Parse JSON response
    const parsed = JSON.parse(response);
    const categories = new Map();
    
    for (const tweet of tweets) {
      let category = parsed[tweet.id];
      
      // Validate category
      if (!category || typeof category !== 'string' || category.length < 2 || category.length > 50) {
        category = config.uncategorizedFolder;
      }
      
      // Clean up
      category = category.replace(/^["']|["']$/g, '').trim();
      categories.set(tweet.id, category);
      
      const isExisting = existingCategories.includes(category);
      const preview = (tweet.text || '').slice(0, 40).replace(/\n/g, ' ');
      console.log(`      ✓ @${tweet.author?.username}: "${preview}..." → ${category} ${isExisting ? '' : '(NEW)'}`);
    }
    
    return categories;
  } catch (error) {
    console.error(`      ✗ Batch error: ${error.message}`);
    console.log(`      → Falling back to Uncategorized for this batch`);
    
    // Return uncategorized for all tweets in batch
    const categories = new Map();
    for (const tweet of tweets) {
      categories.set(tweet.id, config.uncategorizedFolder);
    }
    return categories;
  }
}
