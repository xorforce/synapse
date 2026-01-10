#!/usr/bin/env node

import { readdirSync, readFileSync, statSync, mkdirSync, existsSync, renameSync, cpSync, rmSync } from 'fs';
import { join, dirname, basename } from 'path';
import { createInterface } from 'readline';
import { initGemini, categorizeBatch } from './gemini.js';
import config from '../config.js';

// ═══════════════════════════════════════════════════════════════════════════
// ANSI Colors & Styles
// ═══════════════════════════════════════════════════════════════════════════

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Bright colors
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  
  // Background
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

// Helper functions for styling
const style = {
  title: (s) => `${c.bold}${c.brightCyan}${s}${c.reset}`,
  success: (s) => `${c.brightGreen}${s}${c.reset}`,
  error: (s) => `${c.brightRed}${s}${c.reset}`,
  warning: (s) => `${c.brightYellow}${s}${c.reset}`,
  info: (s) => `${c.brightBlue}${s}${c.reset}`,
  dim: (s) => `${c.dim}${s}${c.reset}`,
  highlight: (s) => `${c.bold}${c.brightMagenta}${s}${c.reset}`,
  category: (s) => `${c.cyan}${s}${c.reset}`,
  number: (s) => `${c.brightYellow}${s}${c.reset}`,
};

// ═══════════════════════════════════════════════════════════════════════════
// Spinner Animation (circles_2 style from cliloaders.com)
// ═══════════════════════════════════════════════════════════════════════════

class Spinner {
  constructor(text = 'Loading') {
    // Braille circle animation frames
    this.frames = ['◐', '◓', '◑', '◒'];
    this.text = text;
    this.current = 0;
    this.interval = null;
  }
  
  start(text) {
    if (text) this.text = text;
    process.stdout.write('\x1b[?25l'); // Hide cursor
    this.interval = setInterval(() => {
      const frame = this.frames[this.current];
      process.stdout.write(`\r  ${c.brightCyan}${frame}${c.reset} ${this.text}`);
      this.current = (this.current + 1) % this.frames.length;
    }, 100);
  }
  
  update(text) {
    this.text = text;
  }
  
  succeed(text) {
    this.stop();
    console.log(`\r  ${style.success('✓')} ${text || this.text}`);
  }
  
  fail(text) {
    this.stop();
    console.log(`\r  ${style.error('✗')} ${text || this.text}`);
  }
  
  info(text) {
    this.stop();
    console.log(`\r  ${style.info('●')} ${text || this.text}`);
  }
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write('\x1b[?25h'); // Show cursor
    process.stdout.write('\r\x1b[K'); // Clear line
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Progress Bar
// ═══════════════════════════════════════════════════════════════════════════

function progressBar(current, total, width = 30) {
  const percent = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  
  const bar = `${c.brightCyan}${'█'.repeat(filled)}${c.dim}${'░'.repeat(empty)}${c.reset}`;
  return `${bar} ${style.number(`${percent}%`)} ${c.dim}(${current}/${total})${c.reset}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Interactive Selection
// ═══════════════════════════════════════════════════════════════════════════

async function selectOption(title, options, defaultIndex = 0) {
  return new Promise((resolve) => {
    let selectedIndex = defaultIndex;
    
    const render = () => {
      // Move cursor up and clear lines
      if (selectedIndex !== defaultIndex || options.length > 0) {
        process.stdout.write(`\x1b[${options.length + 2}A`);
      }
      
      console.log(`\n  ${style.title(title)}`);
      console.log(`  ${c.dim}${'─'.repeat(50)}${c.reset}`);
      
      options.forEach((opt, i) => {
        const isSelected = i === selectedIndex;
        const prefix = isSelected ? `${c.brightCyan}❯${c.reset}` : ' ';
        const text = isSelected 
          ? `${c.bold}${c.brightWhite}${opt.label}${c.reset}` 
          : `${c.dim}${opt.label}${c.reset}`;
        const desc = opt.desc ? ` ${c.dim}${opt.desc}${c.reset}` : '';
        console.log(`  ${prefix} ${text}${desc}`);
      });
    };
    
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    render();
    
    const onKeypress = (key) => {
      if (key === '\u001B\u005B\u0041') { // Up arrow
        selectedIndex = (selectedIndex - 1 + options.length) % options.length;
        render();
      } else if (key === '\u001B\u005B\u0042') { // Down arrow
        selectedIndex = (selectedIndex + 1) % options.length;
        render();
      } else if (key === '\r' || key === '\n') { // Enter
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onKeypress);
        console.log('');
        resolve(options[selectedIndex]);
      } else if (key === '\u0003') { // Ctrl+C
        process.stdin.setRawMode(false);
        process.exit(0);
      }
    };
    
    process.stdin.on('data', onKeypress);
  });
}

async function confirmPrompt(question, defaultYes = true) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const hint = defaultYes ? `${c.dim}[Y/n]${c.reset}` : `${c.dim}[y/N]${c.reset}`;
    
    rl.question(`  ${c.brightYellow}?${c.reset} ${question} ${hint} `, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      if (normalized === '') {
        resolve(defaultYes);
      } else {
        resolve(normalized === 'y' || normalized === 'yes');
      }
    });
  });
}

async function numberPrompt(question, defaultValue, min, max) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(`  ${c.brightYellow}?${c.reset} ${question} ${c.dim}(${min}-${max}, default: ${defaultValue})${c.reset} `, (answer) => {
      rl.close();
      const num = parseInt(answer.trim(), 10);
      if (isNaN(num)) {
        resolve(defaultValue);
      } else {
        resolve(Math.max(min, Math.min(max, num)));
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI Arguments
// ═══════════════════════════════════════════════════════════════════════════

const isDryRun = process.argv.includes('--dry-run');
const skipBackup = process.argv.includes('--no-backup');
const targetArg = process.argv.find(arg => arg.startsWith('--target='));
const depthArg = process.argv.find(arg => arg.startsWith('--depth='));

// ═══════════════════════════════════════════════════════════════════════════
// File System Utilities
// ═══════════════════════════════════════════════════════════════════════════

function getAllMarkdownFiles(dir, files = []) {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    if (entry.startsWith('.')) continue;
    
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      getAllMarkdownFiles(fullPath, files);
    } else if (entry.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function parseMarkdownFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  
  if (!frontmatterMatch) {
    return null;
  }
  
  const frontmatter = frontmatterMatch[1];
  const bodyAfterFrontmatter = content.slice(frontmatterMatch[0].length);
  
  const id = frontmatter.match(/^id:\s*"?([^"\n]+)"?/m)?.[1];
  const author = frontmatter.match(/^author:\s*"?(@?[^"\n]+)"?/m)?.[1]?.replace('@', '');
  const authorName = frontmatter.match(/^author_name:\s*"?([^"\n]+)"?/m)?.[1];
  
  const textMatch = bodyAfterFrontmatter.match(/# Tweet by @[\w]+\n\n([\s\S]*?)\n\n\[View on Twitter\]/);
  const text = textMatch ? textMatch[1].trim() : '';
  
  if (!id) {
    return null;
  }
  
  return {
    id,
    text,
    author: { username: author, name: authorName },
    filePath,
    content
  };
}

function backupVault(vaultPath, targetFolder) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = join(dirname(vaultPath), `${basename(vaultPath)}_backup_${timestamp}`);
  const sourcePath = join(vaultPath, targetFolder);
  const backupTarget = join(backupPath, targetFolder);
  
  mkdirSync(backupPath, { recursive: true });
  cpSync(sourcePath, backupTarget, { recursive: true });
  
  return backupPath;
}

function sanitizeFilename(str) {
  return str
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

function moveToCategory(filePath, category, basePath, dryRun = false) {
  const fileName = basename(filePath);
  const categoryFolder = join(basePath, sanitizeFilename(category));
  const newPath = join(categoryFolder, fileName);
  
  if (dirname(filePath) === categoryFolder) {
    return { moved: false, newPath: filePath, reason: 'already in place' };
  }
  
  if (!dryRun) {
    if (!existsSync(categoryFolder)) {
      mkdirSync(categoryFolder, { recursive: true });
    }
    renameSync(filePath, newPath);
  }
  
  return { moved: true, newPath, reason: 'moved' };
}

function cleanupEmptyDirs(basePath) {
  const entries = readdirSync(basePath);
  let cleaned = 0;
  
  for (const entry of entries) {
    if (entry.startsWith('.')) continue;
    
    const fullPath = join(basePath, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      const subEntries = readdirSync(fullPath).filter(e => !e.startsWith('.'));
      if (subEntries.length === 0) {
        rmSync(fullPath, { recursive: true });
        cleaned++;
      }
    }
  }
  
  return cleaned;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Program
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.clear();
  
  // Header
  console.log('');
  console.log(`  ${c.bgCyan}${c.black}${c.bold}                                                    ${c.reset}`);
  console.log(`  ${c.bgCyan}${c.black}${c.bold}   🧠 SYNAPSE                                       ${c.reset}`);
  console.log(`  ${c.bgCyan}${c.black}${c.bold}   Vault Organizer                                  ${c.reset}`);
  console.log(`  ${c.bgCyan}${c.black}${c.bold}                                                    ${c.reset}`);
  console.log('');
  console.log(`  ${c.dim}Reorganize your notes with AI-powered categorization${c.reset}`);
  console.log(`  ${c.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
  
  if (isDryRun) {
    console.log('');
    console.log(`  ${c.bgMagenta}${c.white}${c.bold} DRY RUN ${c.reset} ${style.warning('No files will be moved')}`);
  }
  
  console.log('');
  console.log(`  ${style.dim('Vault:')} ${style.highlight(config.vaultPath)}`);
  console.log(`  ${style.dim('Date:')}  ${style.info(new Date().toLocaleString())}`);
  
  const spinner = new Spinner();

  try {
    // ─────────────────────────────────────────────────────────────
    // STEP 1: Select target folder
    // ─────────────────────────────────────────────────────────────
    
    let targetFolder;
    
    if (targetArg) {
      targetFolder = targetArg.split('=')[1];
      console.log('');
      console.log(`  ${style.info('●')} Target folder: ${style.category(targetFolder)}`);
    } else {
      const folderOptions = [
        { label: `📚 ${config.bookmarksFolder}`, value: config.bookmarksFolder, desc: '(bookmarks)' },
        { label: `❤️  ${config.likesFolder}`, value: config.likesFolder, desc: '(likes)' },
        { label: '📁 Custom folder...', value: 'custom', desc: '' },
      ];
      
      const selected = await selectOption('Select folder to organize', folderOptions);
      
      if (selected.value === 'custom') {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        targetFolder = await new Promise(resolve => {
          rl.question(`  ${c.brightYellow}?${c.reset} Enter folder path (relative to vault): `, (answer) => {
            rl.close();
            resolve(answer.trim());
          });
        });
      } else {
        targetFolder = selected.value;
      }
    }
    
    const basePath = join(config.vaultPath, targetFolder);
    
    if (!existsSync(basePath)) {
      console.log('');
      console.log(`  ${style.error('✗')} Folder not found: ${basePath}`);
      process.exit(1);
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Get maximum depth preference
    // ─────────────────────────────────────────────────────────────
    
    let maxDepth;
    
    if (depthArg) {
      maxDepth = parseInt(depthArg.split('=')[1], 10);
      maxDepth = Math.max(1, Math.min(5, maxDepth));
    } else {
      console.log('');
      console.log(`  ${style.title('Organization Depth')}`);
      console.log(`  ${c.dim}${'─'.repeat(50)}${c.reset}`);
      console.log(`  ${c.dim}• 1 = Flat structure (all notes in single-level categories)${c.reset}`);
      console.log(`  ${c.dim}• 2+ = Allows nested subcategories${c.reset}`);
      console.log('');
      
      maxDepth = await numberPrompt('Maximum folder depth', 1, 1, 5);
    }
    
    console.log(`  ${style.info('●')} Max depth: ${style.number(maxDepth)}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 3: Scan existing notes
    // ─────────────────────────────────────────────────────────────
    
    console.log('');
    spinner.start('Scanning vault for notes...');
    
    const allFiles = getAllMarkdownFiles(basePath);
    await new Promise(r => setTimeout(r, 500)); // Brief pause for effect
    
    spinner.succeed(`Found ${style.number(allFiles.length)} markdown files`);
    
    if (allFiles.length === 0) {
      console.log('');
      console.log(`  ${style.warning('⚠')} No notes found to organize.`);
      console.log('');
      return;
    }
    
    // Parse files
    spinner.start('Parsing note contents...');
    
    const notes = [];
    let parseErrors = 0;
    let totalSize = 0;
    
    for (const filePath of allFiles) {
      const parsed = parseMarkdownFile(filePath);
      if (parsed) {
        notes.push(parsed);
        totalSize += statSync(filePath).size;
      } else {
        parseErrors++;
      }
    }
    
    spinner.succeed(`Parsed ${style.number(notes.length)} notes ${style.dim(`(${formatBytes(totalSize)})`)}`);
    
    if (parseErrors > 0) {
      console.log(`  ${style.warning('⚠')} Skipped ${parseErrors} files (couldn't parse)`);
    }
    
    if (notes.length === 0) {
      console.log('');
      console.log(`  ${style.error('✗')} No valid notes found to organize.`);
      console.log('');
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 4: Backup option
    // ─────────────────────────────────────────────────────────────
    
    if (!skipBackup && !isDryRun) {
      console.log('');
      console.log(`  ${style.title('Backup')}`);
      console.log(`  ${c.dim}${'─'.repeat(50)}${c.reset}`);
      console.log(`  ${c.dim}This operation will move files around in your vault.${c.reset}`);
      console.log('');
      
      const shouldBackup = await confirmPrompt('Create a backup before organizing?', true);
      
      if (shouldBackup) {
        spinner.start('Creating backup...');
        const backupPath = backupVault(config.vaultPath, targetFolder);
        spinner.succeed(`Backup created: ${style.dim(backupPath)}`);
      } else {
        console.log(`  ${style.info('●')} Skipping backup`);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 5: Confirm reorganization
    // ─────────────────────────────────────────────────────────────
    
    if (!isDryRun) {
      console.log('');
      console.log(`  ${c.dim}${'━'.repeat(50)}${c.reset}`);
      console.log('');
      console.log(`  ${style.title('Ready to Reorganize')}`);
      console.log('');
      console.log(`  ${c.dim}│${c.reset} Notes to process:  ${style.number(notes.length)}`);
      console.log(`  ${c.dim}│${c.reset} Target folder:     ${style.category(targetFolder)}`);
      console.log(`  ${c.dim}│${c.reset} Max depth:         ${style.number(maxDepth)}`);
      console.log('');
      
      const proceed = await confirmPrompt('Proceed with reorganization?', true);
      
      if (!proceed) {
        console.log('');
        console.log(`  ${style.info('●')} Cancelled by user. No changes made.`);
        console.log('');
        return;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 6: Initialize Gemini
    // ─────────────────────────────────────────────────────────────
    
    console.log('');
    console.log(`  ${style.title('AI Categorization')}`);
    console.log(`  ${c.dim}${'─'.repeat(50)}${c.reset}`);
    
    spinner.start('Initializing Gemini AI...');
    initGemini();
    spinner.succeed('Gemini AI ready');

    // ─────────────────────────────────────────────────────────────
    // STEP 7: Re-categorize in batches
    // ─────────────────────────────────────────────────────────────
    
    const batchSize = config.batchSize || 10;
    const totalBatches = Math.ceil(notes.length / batchSize);
    
    console.log('');
    console.log(`  ${style.dim('Processing')} ${style.number(notes.length)} ${style.dim('notes in')} ${style.number(totalBatches)} ${style.dim('batches')}`);
    console.log('');
    
    const allCategories = new Map();
    const existingCategories = [];
    
    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      const start = batchIdx * batchSize;
      const end = Math.min(start + batchSize, notes.length);
      const batch = notes.slice(start, end);
      
      // Show progress
      console.log(`  ${progressBar(batchIdx + 1, totalBatches)}`);
      
      spinner.start(`Categorizing batch ${batchIdx + 1}/${totalBatches}...`);
      
      const tweetsForBatch = batch.map(note => ({
        id: note.id,
        text: note.text,
        author: note.author
      }));
      
      const batchCategories = await categorizeBatch(tweetsForBatch, existingCategories);
      
      // Merge into allCategories
      for (const [id, category] of batchCategories) {
        allCategories.set(id, category);
        
        if (!existingCategories.includes(category) && category !== config.uncategorizedFolder) {
          existingCategories.push(category);
        }
      }
      
      spinner.succeed(`Batch ${batchIdx + 1} complete`);
      
      // Small delay between batches
      if (batchIdx < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 8: Move files to new categories
    // ─────────────────────────────────────────────────────────────
    
    console.log('');
    console.log(`  ${style.title('Moving Files')}`);
    console.log(`  ${c.dim}${'─'.repeat(50)}${c.reset}`);
    
    spinner.start('Reorganizing files...');
    
    let movedCount = 0;
    let skippedCount = 0;
    const newFolders = new Set();
    const categoryCount = new Map();
    
    for (const note of notes) {
      const category = allCategories.get(note.id) || config.uncategorizedFolder;
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
      
      const categoryFolder = join(basePath, sanitizeFilename(category));
      const isNewFolder = !existsSync(categoryFolder) && !newFolders.has(category);
      
      if (isNewFolder) {
        newFolders.add(category);
        if (!isDryRun) {
          mkdirSync(categoryFolder, { recursive: true });
        }
      }
      
      const { moved } = moveToCategory(note.filePath, category, basePath, isDryRun);
      
      if (moved) {
        movedCount++;
      } else {
        skippedCount++;
      }
    }
    
    spinner.succeed(`Moved ${style.number(movedCount)} files`);
    
    // Clean up empty directories
    if (!isDryRun) {
      spinner.start('Cleaning up empty folders...');
      const cleaned = cleanupEmptyDirs(basePath);
      if (cleaned > 0) {
        spinner.succeed(`Removed ${style.number(cleaned)} empty folders`);
      } else {
        spinner.succeed('No empty folders to remove');
      }
    }

    // ─────────────────────────────────────────────────────────────
    // Summary
    // ─────────────────────────────────────────────────────────────
    
    console.log('');
    console.log(`  ${c.dim}${'━'.repeat(50)}${c.reset}`);
    console.log('');
    console.log(`  ${c.bgCyan}${c.black}${c.bold} ✓ REORGANIZATION COMPLETE ${c.reset}`);
    console.log('');
    
    // Stats box
    console.log(`  ${c.dim}┌${'─'.repeat(48)}┐${c.reset}`);
    console.log(`  ${c.dim}│${c.reset}  ${style.dim('Notes processed:')}      ${String(notes.length).padStart(20)}  ${c.dim}│${c.reset}`);
    console.log(`  ${c.dim}│${c.reset}  ${style.dim('Files moved:')}          ${String(movedCount).padStart(20)}  ${c.dim}│${c.reset}`);
    console.log(`  ${c.dim}│${c.reset}  ${style.dim('Already in place:')}     ${String(skippedCount).padStart(20)}  ${c.dim}│${c.reset}`);
    console.log(`  ${c.dim}│${c.reset}  ${style.dim('Categories used:')}      ${String(categoryCount.size).padStart(20)}  ${c.dim}│${c.reset}`);
    console.log(`  ${c.dim}│${c.reset}  ${style.dim('New folders created:')}  ${String(newFolders.size).padStart(20)}  ${c.dim}│${c.reset}`);
    console.log(`  ${c.dim}└${'─'.repeat(48)}┘${c.reset}`);
    
    // Category distribution
    console.log('');
    console.log(`  ${style.title('Category Distribution')}`);
    console.log('');
    
    const sortedCategories = [...categoryCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    const maxCount = sortedCategories[0]?.[1] || 0;
    
    for (const [cat, count] of sortedCategories) {
      const barWidth = Math.round((count / maxCount) * 20);
      const bar = `${c.brightCyan}${'█'.repeat(barWidth)}${c.dim}${'░'.repeat(20 - barWidth)}${c.reset}`;
      const catName = cat.length > 22 ? cat.slice(0, 19) + '...' : cat.padEnd(22);
      console.log(`  ${style.category(catName)} ${bar} ${style.number(count)}`);
    }
    
    if (categoryCount.size > 10) {
      console.log(`  ${c.dim}... and ${categoryCount.size - 10} more categories${c.reset}`);
    }
    
    console.log('');
    console.log(`  ${style.dim('Location:')} ${style.highlight(basePath)}`);
    console.log(`  ${style.dim('Completed:')} ${style.info(new Date().toLocaleString())}`);
    console.log('');
    
  } catch (error) {
    spinner.stop();
    console.log('');
    console.log(`  ${c.bgRed || c.red}${c.white}${c.bold} ✗ ERROR ${c.reset}`);
    console.log('');
    console.log(`  ${style.error(error.message)}`);
    console.log('');
    console.log(`  ${c.dim}Stack trace:${c.reset}`);
    console.log(`  ${c.dim}${error.stack}${c.reset}`);
    console.log('');
    process.exit(1);
  }
}

main();
