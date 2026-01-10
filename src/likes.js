#!/usr/bin/env node

import { fetchLikes } from './bird.js';
import { loadLikesState, saveLikesState, findNewLikes } from './state.js';
import { initGemini, getExistingCategories, categorizeBatch } from './gemini.js';
import { saveTweetsToVault } from './obsidian.js';
import config from '../config.js';

const isDryRun = process.argv.includes('--dry-run');
const isFullSync = process.argv.includes('--full');

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                  🧠 Synapse - Likes Sync                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📅 Started at: ${new Date().toLocaleString()}`);
  console.log(`📁 Vault: ${config.vaultPath}`);
  console.log(`📂 Folder: ${config.likesFolder}`);
  
  if (isFullSync) {
    console.log('');
    console.log('🔄 FULL SYNC MODE - Fetching ALL likes (ignoring maxPages limit)');
  }
  
  if (isDryRun) {
    console.log('');
    console.log('⚠️  DRY RUN MODE - No files will be written, no state will be saved');
  }
  
  console.log('');
  console.log('═'.repeat(60));

  const overallStart = Date.now();
  const batchSize = config.batchSize || 10;

  try {
    // ─────────────────────────────────────────────────────────────
    // STEP 1: Fetch likes from Twitter
    // ─────────────────────────────────────────────────────────────
    console.log('');
    console.log('📥 STEP 1: Fetching likes from Twitter');
    console.log('─'.repeat(60));
    
    const likes = await fetchLikes({ fullSync: isFullSync, dryRun: isDryRun });
    
    if (!likes || likes.length === 0) {
      console.log('');
      console.log('📭 No likes found. Exiting.');
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Load state and find new likes
    // ─────────────────────────────────────────────────────────────
    console.log('');
    console.log('🔄 STEP 2: Checking for new likes');
    console.log('─'.repeat(60));
    
    const processedIds = loadLikesState();
    const newLikes = findNewLikes(likes, processedIds);
    
    if (newLikes.length === 0) {
      console.log('');
      console.log('✨ All likes already processed!');
      console.log('   Nothing new to sync. Exiting.');
      return;
    }

    // Apply limit if configured
    let toProcess = newLikes;
    if (config.maxTweetsPerRun > 0 && newLikes.length > config.maxTweetsPerRun) {
      console.log('');
      console.log(`⚡ Rate limiting: Processing ${config.maxTweetsPerRun} of ${newLikes.length} new likes`);
      toProcess = newLikes.slice(0, config.maxTweetsPerRun);
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 3: Initialize Gemini
    // ─────────────────────────────────────────────────────────────
    console.log('');
    console.log('🤖 STEP 3: Initializing Gemini AI');
    console.log('─'.repeat(60));
    
    initGemini();
    
    // Get existing categories from likes folder
    const existingCategories = getExistingCategories(config.likesFolder);
    console.log(`   → Found ${existingCategories.length} existing categories`);
    if (existingCategories.length > 0) {
      existingCategories.forEach(f => console.log(`      - ${f}`));
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 4: Process batches (categorize + write immediately)
    // ─────────────────────────────────────────────────────────────
    console.log('');
    console.log('📦 STEP 4: Processing batches (categorize → write → save)');
    console.log('─'.repeat(60));
    console.log(`   → Batch size: ${batchSize} tweets per batch`);
    
    const totalBatches = Math.ceil(toProcess.length / batchSize);
    const categoryCount = new Map();
    let totalProcessed = 0;
    
    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      const start = batchIdx * batchSize;
      const end = Math.min(start + batchSize, toProcess.length);
      const batch = toProcess.slice(start, end);
      
      console.log('');
      console.log(`   ┌─────────────────────────────────────────────────────────`);
      console.log(`   │ 📦 Batch ${batchIdx + 1}/${totalBatches} (tweets ${start + 1}-${end})`);
      console.log(`   └─────────────────────────────────────────────────────────`);
      
      // 4a. Categorize this batch
      console.log('');
      console.log('      🤖 Categorizing...');
      const batchCategories = await categorizeBatch(batch, existingCategories);
      
      // Track new categories for future batches
      for (const category of batchCategories.values()) {
        categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
        if (!existingCategories.includes(category) && category !== config.uncategorizedFolder) {
          existingCategories.push(category);
        }
      }
      
      // 4b. Write this batch to Obsidian immediately (using likesFolder)
      console.log('');
      console.log('      💾 Writing to Obsidian...');
      const results = saveTweetsToVault(batch, batchCategories, isDryRun, config.likesFolder);
      
      // 4c. Update state immediately (so progress is saved)
      if (!isDryRun) {
        for (const { tweet } of results) {
          processedIds.add(tweet.id);
        }
        saveLikesState(processedIds);
        console.log(`      ✓ State saved (${processedIds.size} total processed)`);
      }
      
      totalProcessed += results.length;
      
      // Small delay between batches
      if (batchIdx < totalBatches - 1) {
        console.log('');
        console.log('      ⏳ Waiting before next batch...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // ─────────────────────────────────────────────────────────────
    // Summary
    // ─────────────────────────────────────────────────────────────
    const totalTime = ((Date.now() - overallStart) / 1000).toFixed(1);
    
    console.log('');
    console.log('═'.repeat(60));
    console.log('');
    console.log('📊 Category distribution:');
    const sortedCategories = [...categoryCount.entries()].sort((a, b) => b[1] - a[1]);
    sortedCategories.forEach(([cat, count]) => {
      const bar = '█'.repeat(Math.min(count, 20));
      console.log(`   ${cat.padEnd(25)} ${bar} ${count}`);
    });
    
    console.log('');
    console.log('═'.repeat(60));
    console.log('');
    console.log('✅ SYNC COMPLETE!');
    console.log('');
    console.log('📈 Summary:');
    console.log(`   • Total likes fetched: ${likes.length}`);
    console.log(`   • New likes processed: ${totalProcessed}`);
    console.log(`   • Batches processed: ${totalBatches}`);
    console.log(`   • Categories used: ${categoryCount.size}`);
    console.log(`   • Total time: ${totalTime}s`);
    console.log(`   • Vault location: ${config.vaultPath}/${config.likesFolder}`);
    console.log('');
    console.log(`📅 Completed at: ${new Date().toLocaleString()}`);
    console.log('');
    
  } catch (error) {
    console.log('');
    console.log('═'.repeat(60));
    console.log('');
    console.error('❌ SYNC FAILED');
    console.error('');
    console.error(`Error: ${error.message}`);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    console.log('');
    process.exit(1);
  }
}

main();
