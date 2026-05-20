const fs = require('fs');
const https = require('https');
const path = require('path');

const sourceDir = 'E:\\WorkSpace\\我的筆記\\03_遊戲攻略\\紫色晶石';
const outDir = 'E:\\WorkSpace\\GameWIKI\\data\\stoneshard\\articles';
const imgDir = 'E:\\WorkSpace\\GameWIKI\\public\\images\\stoneshard\\beginner-guide';

const filesToMerge = [
  { file: '【攻略】【新手教學】紫色晶石 0.9.4 血兆版本 @Stoneshard 哈啦板 - 巴哈姆特.md', version: '0.9.4', title: '0.9.4 血兆版本新手教學' },
  { file: '【心得】0.9.3版知識分享（賺錢省錢、篷車升級、地牢知識） @Stoneshard 哈啦板 - 巴哈姆特.md', version: '0.9.3', title: '0.9.3 知識分享 (賺錢、篷車、地牢)' },
  { file: '【攻略】【新手教學】紫色晶石 0.9.2.13版本 @Stoneshard 哈啦板 - 巴哈姆特.md', version: '0.9.2.13', title: '0.9.2.13 版本歷史差異' }
];

fs.mkdirSync(imgDir, { recursive: true });

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    if (!url.startsWith('http')) return resolve(url);
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode !== 200) {
        file.close();
        return resolve(); // Skip failed images
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', err => {
      fs.unlink(dest, () => {});
      resolve();
    });
  });
}

async function process() {
  const article = {
    id: "beginner-guide-merged",
    title: "【精華】紫色晶石新手綜合教學大全 (涵蓋 0.9.2 ~ 0.9.4)",
    author: "社群精華整理",
    date: "2026-05-19",
    gameVersion: "0.9.4+",
    category: "guide",
    subcategory: "beginner",
    tags: ["新手", "綜合", "教學", "系統機制", "賺錢"],
    toc: [],
    sections: [],
    comments: [
      {
        author: "系統精靈",
        content: "本文已由 AI 系統進行跨版本合併，以最新版 0.9.4 為核心，補充了 0.9.3 的實用知識與 0.9.2.13 的歷史機制差異。",
        useful: true,
        tags: ["系統提示"]
      }
    ]
  };

  let imgCounter = 1;
  const downloadTasks = [];

  for (const item of filesToMerge) {
    const filePath = path.join(sourceDir, item.file);
    if (!fs.existsSync(filePath)) {
      console.log('File not found:', filePath);
      continue;
    }
    
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Remove YAML frontmatter if exists
    content = content.replace(/^---[\s\S]+?---/, '');
    // Remove heading 1 
    content = content.replace(/^# .+$/m, '');
    
    // Find all images: [![...](URL)](URL) or ![...](URL)
    const regex = /\[?!(?:\[(.*?)\])?\((https?:\/\/.*?)\)\]?(?:\(https?:\/\/.*?\))?/g;
    
    content = content.replace(regex, (match, alt, url) => {
      const ext = path.extname(new URL(url).pathname) || '.jpg';
      const filename = `img_${item.version.replace(/\./g, '_')}_${imgCounter++}${ext}`;
      const localPath = `/images/stoneshard/beginner-guide/${filename}`;
      const dest = path.join(imgDir, filename);
      
      downloadTasks.push(downloadImage(url, dest));
      return `![${alt || 'image'}](${localPath})`;
    });

    article.toc.push({ id: `v_${item.version.replace(/\./g, '_')}`, title: item.title });
    article.sections.push({
      id: `v_${item.version.replace(/\./g, '_')}`,
      title: item.title,
      content: content.trim()
    });
  }

  console.log(`Downloading ${downloadTasks.length} images...`);
  await Promise.all(downloadTasks);

  fs.writeFileSync(path.join(outDir, `${article.id}.json`), JSON.stringify(article, null, 2));
  console.log('JSON generated successfully.');

  // Update index.json
  const files = fs.readdirSync(outDir);
  const index = files.map(f => {
    const d = JSON.parse(fs.readFileSync(path.join(outDir, f)));
    return {
      id: d.id, title: d.title, date: d.date, author: d.author, 
      category: d.category, subcategory: d.subcategory, tags: d.tags
    };
  });
  fs.writeFileSync('E:\\WorkSpace\\GameWIKI\\data\\stoneshard\\index.json', JSON.stringify(index, null, 2));
  console.log('index.json updated.');
  
  // Auto trigger search index builder
  try {
    const { execSync } = require('child_process');
    console.log('Rebuilding search indexes...');
    execSync('node tools/build_search_index.js', { stdio: 'inherit' });
  } catch (err) {
    console.error('Failed to trigger search index builder:', err);
  }
}

process();
