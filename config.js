export default {
  // Obsidian vault path
  vaultPath: '/Users/bhagat/Desktop/Dummy',
  
  // Folder inside vault for bookmarks
  bookmarksFolder: 'Twitter Bookmarks',
  
  // Folder inside vault for likes
  likesFolder: 'Twitter Likes',
  
  // Fallback folder for uncategorizable tweets
  uncategorizedFolder: 'Uncategorized',
  
  // State file to track processed bookmarks
  stateFile: './data/state.json',
  
  // State file to track processed likes
  likesStateFile: './data/likes-state.json',
  
  // Max pages to fetch from bird (0 = unlimited, each page ~20 items)
  // For daily sync, 2-3 pages is usually enough to catch new items
  maxPages: 2,
  
  // Gemini model
  geminiModel: 'gemini-3-flash-preview',
  
  // Batch size for Gemini categorization (tweets per API call)
  batchSize: 10,
  
  // Max tweets to process per run (0 = unlimited)
  maxTweetsPerRun: 0,
  
  // Include metadata table in markdown output
  // (YAML frontmatter is always included for Obsidian queries)
  includeMetadataTable: false,
};

