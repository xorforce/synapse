import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import config from '../config.js';

/**
 * Sanitize a string for use as a filename
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(str) {
  return str
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
    .replace(/\s+/g, ' ')          // Normalize whitespace
    .trim()
    .slice(0, 100);                // Limit length
}

/**
 * Generate a unique filename for a tweet
 * @param {Object} tweet - Tweet object
 * @returns {string} Filename (without extension)
 */
function generateFilename(tweet) {
  const date = tweet.createdAt 
    ? new Date(tweet.createdAt).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  
  const author = tweet.author?.username || 'unknown';
  
  // Get first ~50 chars of tweet text for context
  const textPreview = sanitizeFilename(tweet.text || '')
    .slice(0, 50)
    .trim();
  
  return `${date} @${author} - ${textPreview || tweet.id}`;
}

/**
 * Format a tweet as markdown
 * @param {Object} tweet - Tweet object
 * @returns {string} Markdown content
 */
function formatTweetAsMarkdown(tweet) {
  const createdAt = tweet.createdAt 
    ? new Date(tweet.createdAt).toLocaleString()
    : 'Unknown';
  
  const tweetUrl = `https://twitter.com/${tweet.author?.username || 'i'}/status/${tweet.id}`;
  
  let md = `---
id: "${tweet.id}"
author: "@${tweet.author?.username || 'unknown'}"
author_name: "${(tweet.author?.name || 'Unknown').replace(/"/g, '\\"')}"
created_at: "${tweet.createdAt || ''}"
bookmarked_at: "${new Date().toISOString()}"
likes: ${tweet.likeCount || 0}
retweets: ${tweet.retweetCount || 0}
replies: ${tweet.replyCount || 0}
url: "${tweetUrl}"
conversation_id: "${tweet.conversationId || ''}"
${tweet.inReplyToStatusId ? `in_reply_to: "${tweet.inReplyToStatusId}"` : ''}
---

# Tweet by @${tweet.author?.username || 'unknown'}

${tweet.text || '(No text)'}

[View on Twitter](${tweetUrl})
`;

  // Add metadata table if enabled
  if (config.includeMetadataTable) {
    md += `
---

## Metadata

| Field | Value |
|-------|-------|
| **Author** | [@${tweet.author?.username}](https://twitter.com/${tweet.author?.username}) (${tweet.author?.name || 'Unknown'}) |
| **Posted** | ${createdAt} |
| **Likes** | ${tweet.likeCount || 0} |
| **Retweets** | ${tweet.retweetCount || 0} |
| **Replies** | ${tweet.replyCount || 0} |
| **Link** | [View on Twitter](${tweetUrl}) |
`;
  }

  // Add quoted tweet if present
  if (tweet.quotedTweet) {
    const qt = tweet.quotedTweet;
    const qtUrl = `https://twitter.com/${qt.author?.username || 'i'}/status/${qt.id}`;
    md += `
## Quoted Tweet

> **@${qt.author?.username || 'unknown'}** (${qt.author?.name || 'Unknown'})
> 
> ${(qt.text || '').split('\n').join('\n> ')}
>
> [View quoted tweet](${qtUrl})
`;
  }

  return md;
}

/**
 * Save a tweet to the Obsidian vault
 * @param {Object} tweet - Tweet object
 * @param {string} category - Category/folder name
 * @param {boolean} dryRun - If true, don't actually write files
 * @returns {string} Path to the created file
 */
export function saveTweetToVault(tweet, category, dryRun = false) {
  // Build the folder path
  const folderPath = join(
    config.vaultPath,
    config.bookmarksFolder,
    sanitizeFilename(category)
  );
  
  // Ensure folder exists
  if (!dryRun && !existsSync(folderPath)) {
    mkdirSync(folderPath, { recursive: true });
    console.log(`      → Created new folder: ${category}`);
  }
  
  // Generate filename and full path
  const filename = `${generateFilename(tweet)}.md`;
  const filePath = join(folderPath, filename);
  
  // Generate markdown content
  const content = formatTweetAsMarkdown(tweet);
  
  // Write the file
  if (!dryRun) {
    writeFileSync(filePath, content, 'utf-8');
  }
  
  return filePath;
}

/**
 * Save multiple tweets to the vault
 * @param {Array} tweets - Array of tweet objects
 * @param {Map<string, string>} categories - Map of tweet ID to category
 * @param {boolean} dryRun - If true, don't actually write files
 * @returns {Array<{tweet: Object, path: string, category: string}>} Results
 */
export function saveTweetsToVault(tweets, categories, dryRun = false) {
  const results = [];
  const foldersCreated = new Set();
  
  // Ensure base bookmarks folder exists
  const basePath = join(config.vaultPath, config.bookmarksFolder);
  if (!dryRun && !existsSync(basePath)) {
    mkdirSync(basePath, { recursive: true });
  }
  
  for (const tweet of tweets) {
    const category = categories.get(tweet.id) || config.uncategorizedFolder;
    
    try {
      const folderPath = join(basePath, sanitizeFilename(category));
      const isNewFolder = !existsSync(folderPath) && !foldersCreated.has(category);
      
      const path = saveTweetToVault(tweet, category, dryRun);
      results.push({ tweet, path, category });
      
      if (isNewFolder) {
        foldersCreated.add(category);
        console.log(`      + Created folder: ${category}`);
      }
      
      const filename = path.split('/').pop().slice(0, 50);
      console.log(`      ✓ ${dryRun ? '[DRY]' : 'Saved'}: ${filename}...`);
    } catch (error) {
      console.error(`      ✗ Failed: ${error.message}`);
    }
  }
  
  return results;
}
