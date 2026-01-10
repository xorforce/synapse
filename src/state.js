import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import config from '../config.js';

/**
 * Load the previous state (processed bookmark IDs)
 * @returns {Set<string>} Set of processed bookmark IDs
 */
export function loadState() {
  console.log(`   → Looking for state file: ${config.stateFile}`);
  
  try {
    if (!existsSync(config.stateFile)) {
      console.log('   → State file does not exist, starting fresh');
      console.log('   ✓ Initialized empty state (first run)');
      return new Set();
    }
    
    console.log('   → State file found, reading...');
    const raw = readFileSync(config.stateFile, 'utf-8');
    const data = JSON.parse(raw);
    
    console.log(`   → Last updated: ${data.lastUpdated || 'unknown'}`);
    console.log(`   ✓ Loaded ${data.processedIds.length} previously processed bookmark IDs`);
    
    return new Set(data.processedIds);
  } catch (error) {
    console.warn(`   ⚠ Could not load state: ${error.message}`);
    console.log('   → Starting with empty state');
    return new Set();
  }
}

/**
 * Save the current state
 * @param {Set<string>} processedIds - Set of processed bookmark IDs
 */
export function saveState(processedIds) {
  console.log(`   → Preparing to save state with ${processedIds.size} IDs`);
  
  const dir = dirname(config.stateFile);
  if (!existsSync(dir)) {
    console.log(`   → Creating directory: ${dir}`);
    mkdirSync(dir, { recursive: true });
  }
  
  const data = {
    lastUpdated: new Date().toISOString(),
    processedIds: Array.from(processedIds),
  };
  
  writeFileSync(config.stateFile, JSON.stringify(data, null, 2));
  console.log(`   → State file written: ${config.stateFile}`);
  console.log(`   ✓ Saved state with ${processedIds.size} processed bookmark IDs`);
}

/**
 * Find new bookmarks that haven't been processed yet
 * @param {Array} bookmarks - All fetched bookmarks
 * @param {Set<string>} processedIds - Previously processed IDs
 * @returns {Array} New bookmarks to process
 */
export function findNewBookmarks(bookmarks, processedIds) {
  console.log(`   → Comparing ${bookmarks.length} fetched vs ${processedIds.size} processed`);
  
  const newBookmarks = bookmarks.filter(b => !processedIds.has(b.id));
  const skipped = bookmarks.length - newBookmarks.length;
  
  console.log(`   → Skipping ${skipped} already-processed bookmarks`);
  console.log(`   ✓ Found ${newBookmarks.length} new bookmarks to process`);
  
  if (newBookmarks.length > 0 && newBookmarks.length <= 5) {
    console.log('   → New bookmarks:');
    newBookmarks.forEach((b, i) => {
      console.log(`      ${i + 1}. @${b.author?.username || 'unknown'}: "${(b.text || '').slice(0, 40)}..."`);
    });
  } else if (newBookmarks.length > 5) {
    console.log('   → First 5 new bookmarks:');
    newBookmarks.slice(0, 5).forEach((b, i) => {
      console.log(`      ${i + 1}. @${b.author?.username || 'unknown'}: "${(b.text || '').slice(0, 40)}..."`);
    });
    console.log(`      ... and ${newBookmarks.length - 5} more`);
  }
  
  return newBookmarks;
}

// ─────────────────────────────────────────────────────────────
// Likes-specific state functions
// ─────────────────────────────────────────────────────────────

/**
 * Load the previous likes state (processed like IDs)
 * @returns {Set<string>} Set of processed like IDs
 */
export function loadLikesState() {
  console.log(`   → Looking for likes state file: ${config.likesStateFile}`);
  
  try {
    if (!existsSync(config.likesStateFile)) {
      console.log('   → Likes state file does not exist, starting fresh');
      console.log('   ✓ Initialized empty likes state (first run)');
      return new Set();
    }
    
    console.log('   → Likes state file found, reading...');
    const raw = readFileSync(config.likesStateFile, 'utf-8');
    const data = JSON.parse(raw);
    
    console.log(`   → Last updated: ${data.lastUpdated || 'unknown'}`);
    console.log(`   ✓ Loaded ${data.processedIds.length} previously processed like IDs`);
    
    return new Set(data.processedIds);
  } catch (error) {
    console.warn(`   ⚠ Could not load likes state: ${error.message}`);
    console.log('   → Starting with empty state');
    return new Set();
  }
}

/**
 * Save the current likes state
 * @param {Set<string>} processedIds - Set of processed like IDs
 */
export function saveLikesState(processedIds) {
  console.log(`   → Preparing to save likes state with ${processedIds.size} IDs`);
  
  const dir = dirname(config.likesStateFile);
  if (!existsSync(dir)) {
    console.log(`   → Creating directory: ${dir}`);
    mkdirSync(dir, { recursive: true });
  }
  
  const data = {
    lastUpdated: new Date().toISOString(),
    processedIds: Array.from(processedIds),
  };
  
  writeFileSync(config.likesStateFile, JSON.stringify(data, null, 2));
  console.log(`   → Likes state file written: ${config.likesStateFile}`);
  console.log(`   ✓ Saved state with ${processedIds.size} processed like IDs`);
}

/**
 * Find new likes that haven't been processed yet
 * @param {Array} likes - All fetched likes
 * @param {Set<string>} processedIds - Previously processed IDs
 * @returns {Array} New likes to process
 */
export function findNewLikes(likes, processedIds) {
  console.log(`   → Comparing ${likes.length} fetched vs ${processedIds.size} processed`);
  
  const newLikes = likes.filter(l => !processedIds.has(l.id));
  const skipped = likes.length - newLikes.length;
  
  console.log(`   → Skipping ${skipped} already-processed likes`);
  console.log(`   ✓ Found ${newLikes.length} new likes to process`);
  
  if (newLikes.length > 0 && newLikes.length <= 5) {
    console.log('   → New likes:');
    newLikes.forEach((l, i) => {
      console.log(`      ${i + 1}. @${l.author?.username || 'unknown'}: "${(l.text || '').slice(0, 40)}..."`);
    });
  } else if (newLikes.length > 5) {
    console.log('   → First 5 new likes:');
    newLikes.slice(0, 5).forEach((l, i) => {
      console.log(`      ${i + 1}. @${l.author?.username || 'unknown'}: "${(l.text || '').slice(0, 40)}..."`);
    });
    console.log(`      ... and ${newLikes.length - 5} more`);
  }
  
  return newLikes;
}
