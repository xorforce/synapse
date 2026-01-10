import { execSync } from 'child_process';
import config from '../config.js';

/**
 * Fetches bookmarks from Twitter using bird CLI
 * @param {Object} options - Fetch options
 * @param {boolean} options.fullSync - If true, fetch ALL bookmarks (no pagination limit)
 * @param {boolean} options.dryRun - If true, fetch only 5 bookmarks for testing
 * @returns {Array} Array of bookmark objects
 */
export async function fetchBookmarks({ fullSync = false, dryRun = false } = {}) {
  // Build command based on mode
  let command;
  
  if (dryRun) {
    // Dry run: fetch only 5 bookmarks for quick testing
    command = 'bird bookmarks -n 5 --json';
  } else if (fullSync) {
    // Full sync: fetch everything
    command = 'bird bookmarks --all --json';
  } else if (config.maxPages > 0) {
    // Normal sync: use pagination
    command = `bird bookmarks --all --max-pages ${config.maxPages} --json`;
  } else {
    // No limit configured: fetch all
    command = 'bird bookmarks --all --json';
  }
  
  console.log(`   → Executing: ${command}`);
  if (dryRun) {
    console.log('   → DRY RUN: Fetching only 5 bookmarks for testing...');
  } else if (fullSync) {
    console.log('   → FULL SYNC: Fetching ALL bookmarks (this may take a while)...');
  } else if (config.maxPages > 0) {
    console.log(`   → Fetching recent bookmarks (max ${config.maxPages} pages, ~${config.maxPages * 20} bookmarks)...`);
  } else {
    console.log('   → Fetching ALL bookmarks (this may take a while)...');
  }
  
  const startTime = Date.now();
  
  try {
    const result = execSync(command, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large bookmark lists
    });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   → Bird command completed in ${elapsed}s`);
    
    const parsed = JSON.parse(result);
    // Handle both formats: plain array (no pagination) or { tweets: [...] } (with pagination)
    const bookmarks = Array.isArray(parsed) ? parsed : (parsed.tweets || []);
    console.log(`   → Parsed JSON response successfully`);
    console.log(`   ✓ Fetched ${bookmarks.length} total bookmarks from Twitter`);
    
    if (bookmarks.length > 0) {
      const sample = bookmarks[0];
      console.log(`   → Sample bookmark: @${sample.author?.username || 'unknown'} - "${(sample.text || '').slice(0, 50)}..."`);
    }
    
    return bookmarks;
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   → Bird command failed after ${elapsed}s`);
    
    if (error.stdout) {
      console.log('   → Attempting to parse stdout despite error...');
      try {
        const parsed = JSON.parse(error.stdout);
        const bookmarks = Array.isArray(parsed) ? parsed : (parsed.tweets || []);
        console.log(`   ✓ Recovered ${bookmarks.length} bookmarks from error output`);
        return bookmarks;
      } catch {
        console.log('   → stdout is not valid JSON');
      }
    }
    
    if (error.stderr) {
      console.log(`   → stderr: ${error.stderr.slice(0, 200)}`);
    }

    throw new Error(`Failed to fetch bookmarks: ${error.message}`);
  }
}

/**
 * Fetches likes from Twitter using bird CLI
 * @param {Object} options - Fetch options
 * @param {boolean} options.fullSync - If true, fetch ALL likes (no pagination limit)
 * @param {boolean} options.dryRun - If true, fetch only 5 likes for testing
 * @returns {Array} Array of liked tweet objects
 */
export async function fetchLikes({ fullSync = false, dryRun = false } = {}) {
  // Build command based on mode
  let command;
  
  if (dryRun) {
    // Dry run: fetch only 5 likes for quick testing
    command = 'bird likes -n 5 --json';
  } else if (fullSync) {
    // Full sync: fetch everything
    command = 'bird likes --all --json';
  } else if (config.maxPages > 0) {
    // Normal sync: use pagination
    command = `bird likes --all --max-pages ${config.maxPages} --json`;
  } else {
    // No limit configured: fetch all
    command = 'bird likes --all --json';
  }
  
  console.log(`   → Executing: ${command}`);
  if (dryRun) {
    console.log('   → DRY RUN: Fetching only 5 likes for testing...');
  } else if (fullSync) {
    console.log('   → FULL SYNC: Fetching ALL likes (this may take a while)...');
  } else if (config.maxPages > 0) {
    console.log(`   → Fetching recent likes (max ${config.maxPages} pages, ~${config.maxPages * 20} likes)...`);
  } else {
    console.log('   → Fetching ALL likes (this may take a while)...');
  }
  
  const startTime = Date.now();
  
  try {
    const result = execSync(command, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large lists
    });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   → Bird command completed in ${elapsed}s`);
    
    const parsed = JSON.parse(result);
    // Handle both formats: plain array (no pagination) or { tweets: [...] } (with pagination)
    const likes = Array.isArray(parsed) ? parsed : (parsed.tweets || []);
    console.log(`   → Parsed JSON response successfully`);
    console.log(`   ✓ Fetched ${likes.length} total likes from Twitter`);
    
    if (likes.length > 0) {
      const sample = likes[0];
      console.log(`   → Sample like: @${sample.author?.username || 'unknown'} - "${(sample.text || '').slice(0, 50)}..."`);
    }
    
    return likes;
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   → Bird command failed after ${elapsed}s`);
    
    if (error.stdout) {
      console.log('   → Attempting to parse stdout despite error...');
      try {
        const parsed = JSON.parse(error.stdout);
        const likes = Array.isArray(parsed) ? parsed : (parsed.tweets || []);
        console.log(`   ✓ Recovered ${likes.length} likes from error output`);
        return likes;
      } catch {
        console.log('   → stdout is not valid JSON');
      }
    }
    
    if (error.stderr) {
      console.log(`   → stderr: ${error.stderr.slice(0, 200)}`);
    }

    throw new Error(`Failed to fetch likes: ${error.message}`);
  }
}
