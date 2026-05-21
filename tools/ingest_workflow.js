const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { execSync } = require('child_process');

const pendingDir = path.join(__dirname, '../inbox/pending');
const processedDir = path.join(__dirname, '../inbox/processed');
const gamesFilePath = path.join(__dirname, '../data/games.json');

// Ensure base inbox directories exist
fs.mkdirSync(processedDir, { recursive: true });

function parseYAML(yamlText) {
  const meta = {};
  const lines = yamlText.split('\n');
  for (const line of lines) {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join(':').trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.substring(1, value.length - 1).split(',').map(s => s.trim().replace(/['"]/g, ''));
      }
      meta[key] = value;
    }
  }
  return meta;
}

function splitSections(markdownText, defaultTitle) {
  const sections = [];
  const lines = markdownText.split('\n');
  let currentSection = {
    id: 'intro',
    title: defaultTitle,
    contentLines: []
  };
  
  let sectionCounter = 1;
  
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentSection.contentLines.length > 0 || currentSection.title !== defaultTitle) {
        currentSection.content = currentSection.contentLines.join('\n').trim();
        delete currentSection.contentLines;
        sections.push(currentSection);
      }
      
      const title = line.substring(3).trim();
      const id = `sec_${sectionCounter++}`;
      currentSection = {
        id,
        title,
        contentLines: []
      };
    } else {
      currentSection.contentLines.push(line);
    }
  }
  
  currentSection.content = currentSection.contentLines.join('\n').trim();
  delete currentSection.contentLines;
  sections.push(currentSection);
  
  return sections;
}

function downloadImage(url, dest, maxAttempts = 3) {
  return new Promise((resolve) => {
    if (!url.startsWith('http')) return resolve(url);
    if (fs.existsSync(dest)) {
      console.log(`[Ingest Workflow] Image already exists: ${dest}`);
      return resolve();
    }
    
    const tmpPath = dest + '.tmp';
    
    const downloadAttempt = (attempt) => {
      return new Promise((resResolve, resReject) => {
        let startBytes = 0;
        if (fs.existsSync(tmpPath)) {
          startBytes = fs.statSync(tmpPath).size;
        }
        
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://forum.gamer.com.tw/'
        };
        
        if (startBytes > 0) {
          headers['Range'] = `bytes=${startBytes}-`;
        }
        
        const options = { headers };
        
        const req = https.get(url, options, res => {
          const statusCode = res.statusCode;
          
          if (statusCode === 416) {
            try { fs.unlinkSync(tmpPath); } catch (_) {}
            return resReject(new Error(`HTTP 416: Range Not Satisfiable`));
          }
          
          if (statusCode !== 200 && statusCode !== 206) {
            return resReject(new Error(`HTTP Status ${statusCode}`));
          }
          
          const isAppend = statusCode === 206;
          const fileStream = fs.createWriteStream(tmpPath, { flags: isAppend ? 'a' : 'w' });
          
          res.pipe(fileStream);
          
          fileStream.on('finish', () => {
            fileStream.close(() => {
              try {
                fs.renameSync(tmpPath, dest);
                console.log(`[Ingest Workflow] Successfully downloaded image to ${dest} (Attempt ${attempt})`);
                resResolve();
              } catch (err) {
                resReject(err);
              }
            });
          });
          
          fileStream.on('error', err => {
            fileStream.close();
            resReject(err);
          });
        });
        
        req.on('error', err => {
          resReject(err);
        });
        
        req.setTimeout(10000, () => {
          req.destroy(new Error('Request timeout'));
        });
      });
    };
    
    const runAttempts = async (attempt = 1) => {
      try {
        await downloadAttempt(attempt);
        resolve();
      } catch (err) {
        console.warn(`[Ingest Workflow] Failed to download image ${url} on attempt ${attempt}: ${err.message}`);
        if (attempt < maxAttempts) {
          const delay = 1000 * attempt;
          console.log(`[Ingest Workflow] Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          return runAttempts(attempt + 1);
        } else {
          console.error(`[Ingest Workflow] Max attempts reached for ${url}. Skipping image.`);
          if (fs.existsSync(tmpPath)) {
            try { fs.unlinkSync(tmpPath); } catch (_) {}
          }
          resolve();
        }
      }
    };
    
    runAttempts();
  });
}

function updateGamesJsonList(gameSlug, meta) {
  let gamesData = { games: [] };
  if (fs.existsSync(gamesFilePath)) {
    try {
      gamesData = JSON.parse(fs.readFileSync(gamesFilePath, 'utf-8'));
    } catch (e) {
      console.error('[Ingest Workflow] Failed to parse games.json, creating a new one.', e);
    }
  }

  const existingGameIdx = gamesData.games.findIndex(g => g.slug === gameSlug);
  const gameTitle = meta.gameTitle || (gameSlug.charAt(0).toUpperCase() + gameSlug.slice(1));
  const gameCover = meta.gameCover || `/images/${gameSlug}/cover.jpg`;
  const gameDescription = meta.gameDescription || `${gameTitle} 攻略 WIKI`;

  if (existingGameIdx === -1) {
    console.log(`[Ingest Workflow] Registering new game in games.json: ${gameSlug}`);
    gamesData.games.push({
      slug: gameSlug,
      title: gameTitle,
      cover: gameCover,
      description: gameDescription,
      articleCount: 0,
      lastUpdated: new Date().toISOString().split('T')[0]
    });
  } else {
    // Update metadata if provided in the latest ingest
    if (meta.gameTitle) gamesData.games[existingGameIdx].title = gameTitle;
    if (meta.gameCover) gamesData.games[existingGameIdx].cover = gameCover;
    if (meta.gameDescription) gamesData.games[existingGameIdx].description = gameDescription;
  }

  fs.writeFileSync(gamesFilePath, JSON.stringify(gamesData, null, 2), 'utf-8');
}

function checkAndCreateGameConfig(gameSlug, meta) {
  const gameConfigDir = path.join(__dirname, `../data/${gameSlug}`);
  fs.mkdirSync(gameConfigDir, { recursive: true });
  
  const gameConfigPath = path.join(gameConfigDir, 'game.json');
  if (!fs.existsSync(gameConfigPath)) {
    console.log(`[Ingest Workflow] Creating default game.json config for ${gameSlug}`);
    const gameTitle = meta.gameTitle || (gameSlug.charAt(0).toUpperCase() + gameSlug.slice(1));
    const defaultConfig = {
      slug: gameSlug,
      title: gameTitle,
      categories: {
        guide: {
          label: "攻略教學",
          icon: "📖",
          description: "新手教學、系統介紹等固定內容",
          subcategories: [
            { "slug": "beginner", "label": "新手入門" },
            { "slug": "systems", "label": "系統機制" },
            { "slug": "misc", "label": "綜合攻略" }
          ]
        },
        build: {
          label: "流派配置",
          icon: "⚔️",
          subcategories: [
            { "slug": "beginner-builds", "label": "開荒配置" },
            { "slug": "endgame-builds", "label": "後期流派" }
          ]
        }
      }
    };
    fs.writeFileSync(gameConfigPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
  }
}

async function run() {
  console.log('[Ingest Workflow] Scanning inbox/pending for Markdown files...');
  
  let files;
  try {
    files = fs.readdirSync(pendingDir);
  } catch (err) {
    console.log('[Ingest Workflow] pending directory is empty.');
    return;
  }
  
  const mdFiles = files.filter(f => f.endsWith('.md'));
  if (mdFiles.length === 0) {
    console.log('[Ingest Workflow] No pending Markdown files found.');
    return;
  }
  
  const affectedGames = new Set();
  
  for (const file of mdFiles) {
    const filePath = path.join(pendingDir, file);
    console.log(`\n[Ingest Workflow] Processing: ${file}...`);
    
    let rawContent = fs.readFileSync(filePath, 'utf-8');
    
    // Strip UTF-8 BOM if present
    if (rawContent.charCodeAt(0) === 0xFEFF) {
      rawContent = rawContent.substring(1);
    }
    
    // Parse Frontmatter
    let meta = {
      game: 'stoneshard',
      title: path.basename(file, '.md'),
      author: '社群精華整理',
      source: 'https://forum.gamer.com.tw/',
      date: new Date().toISOString().split('T')[0],
      gameVersion: '1.0.0',
      category: 'guide',
      subcategory: 'misc',
      tags: []
    };
    
    const frontmatterMatch = rawContent.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);
    let mdBody = rawContent;
    if (frontmatterMatch) {
      const parsed = parseYAML(frontmatterMatch[1]);
      meta = { ...meta, ...parsed };
      mdBody = rawContent.replace(/^---[\s\S]+?---/, '').trim();
    }
    
    const gameSlug = meta.game.toLowerCase().trim();
    affectedGames.add(gameSlug);
    
    // Register game and configuration
    updateGamesJsonList(gameSlug, meta);
    checkAndCreateGameConfig(gameSlug, meta);
    
    const articleId = meta.id || path.basename(file, '.md').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    meta.id = articleId;
    
    // Setup dynamic paths
    const gameArticlesDir = path.join(__dirname, `../data/${gameSlug}/articles`);
    const gamePublicImgDir = path.join(__dirname, `../public/images/${gameSlug}`);
    fs.mkdirSync(gameArticlesDir, { recursive: true });
    fs.mkdirSync(gamePublicImgDir, { recursive: true });
    
    // Prepare image dir
    const articleImgDir = path.join(gamePublicImgDir, articleId);
    fs.mkdirSync(articleImgDir, { recursive: true });
    
    // Find images and prepare download tasks
    const imgRegex = /!\[(.*?)\]\((https?:\/\/.*?)\)/g;
    const downloadTasks = [];
    let imgCounter = 1;
    
    mdBody = mdBody.replace(imgRegex, (match, alt, url) => {
      const ext = path.extname(new URL(url).pathname).split('?')[0] || '.jpg';
      const filename = `img_${imgCounter++}${ext}`;
      const localPath = `/images/${gameSlug}/${articleId}/${filename}`;
      const dest = path.join(articleImgDir, filename);
      
      downloadTasks.push(downloadImage(url, dest));
      return `![${alt || 'image'}](${localPath})`;
    });
    
    if (downloadTasks.length > 0) {
      console.log(`[Ingest Workflow] Downloading ${downloadTasks.length} images...`);
      await Promise.all(downloadTasks);
    }
    
    // Split sections & TOC
    const sections = splitSections(mdBody, meta.title);
    const toc = sections.map(s => ({ id: s.id, title: s.title }));
    
    const articleJSON = {
      id: meta.id,
      title: meta.title,
      author: meta.author,
      source: meta.source,
      date: meta.date,
      gameVersion: meta.gameVersion,
      category: meta.category,
      subcategory: meta.subcategory,
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      toc,
      sections,
      comments: []
    };
    
    // Write article JSON
    const articleDest = path.join(gameArticlesDir, `${articleId}.json`);
    fs.writeFileSync(articleDest, JSON.stringify(articleJSON, null, 2), 'utf-8');
    console.log(`[Ingest Workflow] Generated article JSON: ${articleId}.json`);
    
    // Move processed file
    const processedPath = path.join(processedDir, file);
    if (fs.existsSync(processedPath)) {
      fs.unlinkSync(processedPath);
    }
    fs.renameSync(filePath, processedPath);
    console.log(`[Ingest Workflow] Moved original Markdown to inbox/processed/`);
  }
  
  // Rebuild indexes for affected games
  console.log('\n[Ingest Workflow] Updating index.json & games.json statistics...');
  let gamesData = { games: [] };
  if (fs.existsSync(gamesFilePath)) {
    gamesData = JSON.parse(fs.readFileSync(gamesFilePath, 'utf-8'));
  }
  
  for (const gameSlug of affectedGames) {
    const gameArticlesDir = path.join(__dirname, `../data/${gameSlug}/articles`);
    const gameIndexFilePath = path.join(__dirname, `../data/${gameSlug}/index.json`);
    
    let existingFiles = [];
    try {
      existingFiles = fs.readdirSync(gameArticlesDir);
    } catch (e) {
      console.warn(`[Ingest Workflow] Articles directory not found for ${gameSlug}`);
      continue;
    }
    
    const indexData = [];
    for (const file of existingFiles) {
      if (file.endsWith('.json')) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(gameArticlesDir, file), 'utf-8'));
          if (!indexData.some(item => item.id === data.id)) {
            indexData.push({
              id: data.id,
              title: data.title,
              author: data.author,
              date: data.date,
              gameVersion: data.gameVersion,
              category: data.category,
              subcategory: data.subcategory,
              tags: data.tags
            });
          }
        } catch (e) {
          console.error(`[Ingest Workflow] Error parsing ${file}`, e);
        }
      }
    }
    
    // Write game index.json
    fs.writeFileSync(gameIndexFilePath, JSON.stringify(indexData, null, 2), 'utf-8');
    console.log(`[Ingest Workflow] Rebuilt index.json for ${gameSlug} (${indexData.length} articles)`);
    
    // Update games.json article count and last updated date
    const gameIdx = gamesData.games.findIndex(g => g.slug === gameSlug);
    if (gameIdx !== -1) {
      gamesData.games[gameIdx].articleCount = indexData.length;
      gamesData.games[gameIdx].lastUpdated = new Date().toISOString().split('T')[0];
    }
  }
  
  fs.writeFileSync(gamesFilePath, JSON.stringify(gamesData, null, 2), 'utf-8');
  console.log('[Ingest Workflow] games.json updated with new counts and timestamps.');
  
  // Trigger search index build
  try {
    console.log('[Ingest Workflow] Rebuilding search indexes...');
    execSync(`"${process.execPath}" tools/build_search_index.js`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } catch (err) {
    console.error('[Ingest Workflow] Failed to rebuild search indexes', err);
  }
  
  console.log('[Ingest Workflow] All tasks completed successfully!');
}

run();
