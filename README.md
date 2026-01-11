# 🧠 Synapse

Sync your Twitter/X bookmarks to Obsidian with AI-powered categorization.

## What It Does

1. **Fetches** your Twitter bookmarks using the [bird CLI](https://github.com/steipete/bird)
2. **Diffs** against previously processed bookmarks (only processes new ones)
3. **Categorizes** each tweet using Google Gemini AI
4. **Saves** as markdown files in your Obsidian vault, organized into smart folders

## Features

- 📚 Automatic folder categorization using Gemini AI
- 🔄 Incremental sync (only processes new bookmarks)
- 📝 Rich markdown files with full metadata (likes, retweets, author, etc.)
- 🏷️ YAML frontmatter for Obsidian Dataview queries
- ⚡ Pagination support for efficient API usage
- 🔗 Direct links back to original tweets
- 🧹 **Vault Organizer** - Reorganize existing notes without re-fetching
- 🎨 **Beautiful CLI** - Interactive prompts, spinners, progress bars & colors

## Prerequisites

### 1. Node.js 18+
```bash
node --version  # Should be v18 or higher
```

### 2. Twitter Authentication
Synapse includes the [bird CLI](https://github.com/steipete/bird) automatically. Bird needs access to your Twitter session. The easiest way:

1. Log into [x.com](https://x.com) in Safari/Chrome/Firefox
2. Verify it works:
   ```bash
   bird whoami
   ```

For more info on how to setup bird, visit [here](https://github.com/steipete/bird).

### 3. Gemini API Key
Get an API key from [Google AI Studio](https://aistudio.google.com/apikey)

## Installation

### Option 1: Install from npm (recommended)

```bash
# Install globally
npm install -g @xorforce/synapse

# Now you can use the CLI commands anywhere
synapse --help
synapse-organize --help
synapse-likes --help
```

### Option 2: Clone and run locally

```bash
# Clone the repo
git clone https://github.com/xorforce/synapse
cd synapse

# Install dependencies
npm install

# Run with npm scripts
npm run fetch
npm run organize
```

## Configuration

Edit `config.js` to customize:

```javascript
export default {
  // Path to your Obsidian vault
  vaultPath: '<your-vault-path-here>',
  
  // Folder inside vault for bookmarks
  bookmarksFolder: '<your-twitter-bookmarks-folder-name here>',
  
  // Fallback folder for uncategorizable tweets
  uncategorizedFolder: '<folder-name-for-unactegorized-entries>',
  
  // State file to track processed bookmarks
  stateFile: '<path-to-state-file here>',
  
  // Max pages to fetch (0 = unlimited, each page ~20 bookmarks)
  // For daily sync, 2-3 pages is usually enough
  maxPages: 2, // max page count
  
  // Gemini model for categorization
  geminiModel: 'gemini-2.0-flash',
  
  // Batch size for Gemini API (tweets per request, reduces API calls)
  batchSize: 10,
  
  // Max tweets to process per run (0 = unlimited)
  maxTweetsPerRun: 0,
  
  // Include visible metadata table in markdown (frontmatter always included)
  includeMetadataTable: true,
};
```

> ⚠️ **Important:** Always test synapse on an empty or dummy vault first before pointing it at your actual Obsidian vault. This ensures you understand how the tool organizes files and lets you verify everything works as expected without risking your real notes.

## Usage

### Set API Key
```bash
export GEMINI_API_KEY="your-api-key-here"
```

### Run Sync (Daily)
```bash
npm run fetch
```
This fetches recent bookmarks (limited by `maxPages` in config, default ~40 bookmarks).

### Full Sync (First Time / Catch Up)
```bash
npm run fetch:full
```
This fetches **ALL** bookmarks, ignoring the `maxPages` limit. Use this for:
- First-time setup to import your entire bookmark history
- Catching up after a long break
- Re-syncing if you think you missed some

### Dry Run (Preview Without Writing)
```bash
npm run dry-run          # Preview daily sync
npm run dry-run:full     # Preview full sync
```

### Command Line Flags
| Flag | Description |
|------|-------------|
| `--dry-run` | Preview mode - no files written, no state saved |
| `--full` | Fetch ALL bookmarks (ignore maxPages limit) |

You can combine flags:
```bash
node src/index.js --dry-run --full
```

### Reorganize Existing Vault

Already have a vault with notes that need better organization? Use the vault organizer with its beautiful interactive CLI:

```bash
npm run organize            # Interactive mode
npm run organize:dry-run    # Preview without moving files
npm run organize:bookmarks  # Organize bookmarks folder
npm run organize:likes      # Organize likes folder
```

#### Interactive CLI Experience

The organizer features a polished, user-friendly interface:

```
  ┌────────────────────────────────────────────────────┐
  │   🧠 SYNAPSE                                       │
  │   Vault Organizer                                  │
  └────────────────────────────────────────────────────┘

  Select folder to organize
  ──────────────────────────────────────────────────────
  ❯ 📚 Twitter Bookmarks (bookmarks)
    ❤️  Twitter Likes (likes)
    📁 Custom folder...

  ◐ Scanning vault for notes...
  ✓ Found 1911 markdown files
  ✓ Parsed 1911 notes (1.3 MB)

  ████████████░░░░░░░░░░░░░░░░░░ 45% (86/192)
```

**Features:**
- 🎨 **Colorful output** with intuitive icons
- ⌨️ **Arrow key navigation** for folder selection
- 🔄 **Animated spinners** during processing
- 📊 **Progress bars** with batch tracking
- 📈 **Category distribution chart** at completion

The organizer will:
1. Let you **select** which folder to organize (arrow keys to navigate)
2. Ask for **maximum folder depth** (1 = flat categories, 2+ = nested)
3. Prompt for **backup** before making changes
4. **Re-categorize** all existing notes using Gemini AI
5. **Move files** to their new category folders
6. **Clean up** empty folders

#### Summary Output

```
  ┌────────────────────────────────────────────────┐
  │  Notes processed:                       1911   │
  │  Files moved:                           1850   │
  │  Categories used:                         47   │
  │  New folders created:                     12   │
  └────────────────────────────────────────────────┘

  Category Distribution
  AI Development Tools   ████████████████████ 342
  AI Agent Development   ██████████████████░░ 298
  Swift Programming      ██████████░░░░░░░░░░ 156
  Startup Advice         ████████░░░░░░░░░░░░ 124
```

#### Organize Command Flags
| Flag | Description |
|------|-------------|
| `--dry-run` | Preview mode - no files moved |
| `--no-backup` | Skip the backup prompt |
| `--target=FolderName` | Specify target folder directly |
| `--depth=N` | Set max folder depth (1-5) |

Example:
```bash
# Reorganize with max depth 2, no backup prompt
node src/organize.js --target="Twitter Bookmarks" --depth=2 --no-backup
```

## Output Structure

```
Obsidian Vault/
└── Twitter Bookmarks/
    ├── AI Development/
    │   ├── 2026-01-05 @openai - Announcing GPT-5 with reasoning.md
    │   └── 2026-01-04 @anthropic - Claude now supports.md
    ├── Swift Packages/
    │   ├── 2026-01-05 @johnsundell - New Swift package alert.md
    │   └── 2026-01-05 @pointfreeco - Composable Architecture 2.0.md
    ├── Developer Resources/
    │   └── 2026-01-03 @github - The only resource you need.md
    └── Uncategorized/
        └── 2026-01-02 @random - Could not categorize this.md
```

## Markdown File Format

Each bookmark is saved as a markdown file with YAML frontmatter (for Obsidian Dataview) and optionally a visible metadata table.

Set `includeMetadataTable: false` in config for cleaner output (frontmatter is always kept).

**Full format (default):**

```markdown
---
id: "1234567890"
author: "@username"
author_name: "Display Name"
created_at: "Mon Jan 05 12:00:00 +0000 2026"
bookmarked_at: "2026-01-06T10:30:00.000Z"
likes: 1234
retweets: 567
replies: 89
url: "https://twitter.com/username/status/1234567890"
conversation_id: "1234567890"
---

# Tweet by @username

Full tweet text here with links and hashtags preserved.

---

## Metadata

| Field | Value |
|-------|-------|
| **Author** | [@username](https://twitter.com/username) (Display Name) |
| **Posted** | 1/5/2026, 12:00:00 PM |
| **Likes** | 1234 |
| **Retweets** | 567 |
| **Replies** | 89 |
| **Link** | [View on Twitter](https://twitter.com/username/status/1234567890) |
```

**Minimal format (`includeMetadataTable: false`):**

```markdown
---
id: "1234567890"
author: "@username"
... (same frontmatter)
---

# Tweet by @username

Full tweet text here with links and hashtags preserved.

[View on Twitter](https://twitter.com/username/status/1234567890)
```

## Cron Job Setup (Daily Sync)

### Option 1: crontab

```bash
crontab -e
```

Add (runs daily at 9 AM):
```cron
0 9 * * * cd /Users/bhagat/Desktop/bhagat/synapse && GEMINI_API_KEY="your-key" /usr/local/bin/node src/index.js >> /tmp/synapse.log 2>&1
```

Verify:
```bash
crontab -l
```

### Option 2: launchd (macOS)

Create `~/Library/LaunchAgents/com.synapse.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.synapse</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/bhagat/Desktop/bhagat/synapse/src/index.js</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>GEMINI_API_KEY</key>
        <string>your-api-key-here</string>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin</string>
    </dict>
    <key>WorkingDirectory</key>
    <string>/Users/bhagat/Desktop/bhagat/synapse</string>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>9</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/synapse.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/synapse-error.log</string>
</dict>
</plist>
```

Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.synapse.plist
```

## How It Works

### State Management
- Processed bookmark IDs are stored in `data/state.json`
- Only new bookmarks (not in state) are processed on each run
- Delete `data/state.json` to reprocess everything

### AI Categorization (Batch Processing)
Tweets are categorized in **batches** (default: 10 per API call) for efficiency:
- 40 tweets = 4 API calls instead of 40
- ~80% faster than individual requests
- Reduces rate limiting issues

Gemini analyzes each batch and either:
1. **Reuses** an existing category folder if it fits
2. **Creates** a new category if none fit well

Categories are concise (2-4 words) and topic-focused like:
- "AI Development"
- "Swift Packages" 
- "Startup Advice"
- "Web Development"
- "Career Tips"

### Pagination
- Uses `bird bookmarks --all --max-pages N` for efficient fetching
- Default: 2 pages (~40 bookmarks) - good for daily sync
- Use `npm run fetch:full` or `--full` flag to fetch everything
- Or set `maxPages: 0` in config for always unlimited

## Project Structure

```
synapse/
├── config.js           # Configuration options
├── package.json        # Dependencies
├── README.md           # This file
├── data/
│   └── state.json      # Tracks processed bookmarks
└── src/
    ├── index.js        # Main entry point (bookmark sync)
    ├── likes.js        # Likes sync
    ├── organize.js     # Vault reorganizer (no fetch)
    ├── bird.js         # Twitter API via bird CLI
    ├── gemini.js       # AI categorization
    ├── obsidian.js     # Markdown file generation
    └── state.js        # State management
```

## Troubleshooting

### "bird: command not found"
Bird is bundled with synapse. If you installed synapse globally, bird should be available. Try reinstalling:
```bash
npm install -g @xorforce/synapse
which bird
```

### "Missing required credentials"
Bird can't find Twitter cookies. Either:
1. Log into x.com in Safari and grant Full Disk Access to Terminal
2. Set `AUTH_TOKEN` and `CT0` environment variables manually

### "GEMINI_API_KEY environment variable is required"
Set the API key before running:
```bash
export GEMINI_API_KEY="your-key"
```

### Rate Limiting (429 errors)
Gemini has rate limits. The script handles this gracefully by:
- Using "Uncategorized" folder for failed categorizations
- Adding small delays between API calls

### Reprocessing All Bookmarks
Delete the state file to start fresh:
```bash
rm -rf data/
npm run fetch
```

## Obsidian Tips

### Dataview Queries
With the YAML frontmatter, you can query your bookmarks:

```dataview
TABLE author, likes, retweets
FROM "Twitter Bookmarks"
WHERE likes > 100
SORT likes DESC
```

### Graph View
Enable backlinks to see connections between tweets in the same conversation.

## License

MIT

## Credits

- [bird CLI](https://github.com/steipete/bird) - Twitter API access (bundled)
- [Google Gemini](https://ai.google.dev/) - AI categorization
