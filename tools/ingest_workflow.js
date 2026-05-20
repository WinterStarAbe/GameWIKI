const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { execSync } = require('child_process');

const pendingDir = path.join(__dirname, '../inbox/pending');
const processedDir = path.join(__dirname, '../inbox/processed');
const articlesDir = path.join(__dirname, '../data/stoneshard/articles');
const publicImgDir = path.join(__dirname, '../public/images/stoneshard');

// Ensure directories exist
fs.mkdirSync(processedDir, { recursive: true });
fs.mkdirSync(articlesDir, { recursive: true });
fs.mkdirSync(publicImgDir, { recursive: true });

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

function downloadImage(url, dest) {
  return new Promise((resolve) => {
    if (!url.startsWith('http')) return resolve(url);
    if (fs.existsSync(dest)) {
      console.log(`[Ingest Workflow] Image already exists: ${dest}`);
      return resolve();
    }
    
    const file = fs.createWriteStream(dest);
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://forum.gamer.com.tw/'
      }
    };
    
    https.get(url, options, res => {
      if (res.statusCode !== 200) {
        console.error(`[Ingest Workflow] Failed to download image ${url}. HTTP Status: ${res.statusCode}`);
        file.close();
        fs.unlink(dest, () => {});
        return resolve();
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          console.log(`[Ingest Workflow] Successfully downloaded image to ${dest}`);
          resolve();
        });
      });
    }).on('error', err => {
      console.error(`[Ingest Workflow] Error downloading image ${url}: ${err.message}`);
      file.close();
      fs.unlink(dest, () => {});
      resolve();
    });
  });
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
      title: path.basename(file, '.md'),
      author: '社群精華整理',
      source: 'https://forum.gamer.com.tw/C.php?bsn=38794',
      date: new Date().toISOString().split('T')[0],
      gameVersion: '0.9.4+',
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
    
    const articleId = meta.id || path.basename(file, '.md').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    meta.id = articleId;
    
    // Prepare image dir
    const articleImgDir = path.join(publicImgDir, articleId);
    fs.mkdirSync(articleImgDir, { recursive: true });
    
    // Find images and prepare download tasks
    const imgRegex = /!\[(.*?)\]\((https?:\/\/.*?)\)/g;
    const downloadTasks = [];
    let imgCounter = 1;
    
    mdBody = mdBody.replace(imgRegex, (match, alt, url) => {
      const ext = path.extname(new URL(url).pathname).split('?')[0] || '.jpg';
      const filename = `img_${imgCounter++}${ext}`;
      const localPath = `/images/stoneshard/${articleId}/${filename}`;
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
    const articleDest = path.join(articlesDir, `${articleId}.json`);
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
  
  // Rebuild index.json
  console.log('\n[Ingest Workflow] Rebuilding index.json...');
  const existingFiles = fs.readdirSync(articlesDir);
  const indexData = [];
  
  for (const file of existingFiles) {
    if (file.endsWith('.json')) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(articlesDir, file), 'utf-8'));
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
  
  fs.writeFileSync(path.join(articlesDir, '../../index.json'), JSON.stringify(indexData, null, 2), 'utf-8');
  console.log('[Ingest Workflow] index.json rebuilt successfully.');
  
  // Trigger search index build
  try {
    console.log('[Ingest Workflow] Rebuilding search indexes...');
    execSync('node tools/build_search_index.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } catch (err) {
    console.error('[Ingest Workflow] Failed to rebuild search indexes', err);
  }
  
  console.log('[Ingest Workflow] All tasks completed successfully!');
}

run();
