const fs = require('fs');
const path = require('path');

const pendingDir = path.resolve(__dirname, '../inbox/pending');

const nioh3IdsMap = {
  'nioh3-beginner-guide.md': 'nioh3-beginner-guide',
  '《仁王3》旋棍無限旋轉流BD分享 旋棍無限旋轉流怎麼構築-遊民星空 GamerSky.com.md': 'nioh3-shalg-spin-bd',
  '【問題】更新使用方法，旋棍輪椅閉眼也能打過王，十分影響遊戲體驗 @仁王 哈啦板 - 巴哈姆特.md': 'nioh3-shalg-wheelchair-guide',
  '【心得】一個套裝輕鬆遊玩全部武士的武器 @仁王 哈啦板 - 巴哈姆特.md': 'nioh3-one-set-all-weapons',
  '【心得】二周目配裝思路（弁才天5+昆沙門天7）減傷靈技流 @仁王 哈啦板 - 巴哈姆特.md': 'nioh3-ngplus-reduction-build',
  '【心得】仁王3 一周目無雷心得 + 懶人包小技巧 (4樓更新效率刷裝點 & 裝備整理) @仁王 哈啦板 - 巴哈姆特.md': 'nioh3-first-playthrough-tips',
  '【心得】刀的武技評價（無傷心得、密傳測試持續更新中） @仁王 哈啦板 - 巴哈姆特.md': 'nioh3-katana-skills-review',
  '【攻略】仁王3】後期最速刷裝方法-更快畢業實現裝備自由 @仁王 哈啦板 - 巴哈姆特.md': 'nioh3-endgame-gear-farming',
  '【攻略】仁王３全主線BOSS跟其他BOSS 全裸不穿裝無傷 武士太刀 忍者太刀 新增2周目 傲岸鬼 禁忍者 @仁王 哈啦板 - 巴哈姆特.md': 'nioh3-all-bosses-no-armor',
  '【攻略】外鄉人戰法 爆炸箭x陰陽術 二周目裝備配置 (v1.03版) @仁王 哈啦板 - 巴哈姆特.md': 'nioh3-explosive-arrows-magic-build',
  '【攻略】忍者_武士 背水定身流 逃課手斧進化版 充能琢技 x 武技爆發 二周目裝備配置 (V1.04版) @仁王 哈啦板 - 巴哈姆特.md': 'nioh3-hatchets-backwater-bind-build',
  '【攻略】忍者配裝 影縫定身流 x 溪水之法 推薦機關棍&旋棍 不綁武器 忍者_武士 雙 堅忍A_敏捷A 二周目裝備配置 (v1.03版) @仁王 哈啦板 - 巴哈姆特.md': 'nioh3-ninja-shadow-bind-build',
  '【攻略】減傷吸精華流 斧 ( 大旋風x八手亂劍 ) 其他武器可用 二周目裝備配置 (v1.03版) @仁王 哈啦板 - 巴哈姆特.md': 'nioh3-axe-spin-absorption-build',
  '仁王 3 (Nioh 3) 全BOSS打法及難度評級.md': 'nioh3-all-bosses-rating',
  '仁王 3 (Nioh 3) 全奇譚任務攻略.md': 'nioh3-all-quest-guides',
  '仁王 3 (Nioh 3) 前期必拿道具介紹.md': 'nioh3-early-must-have-items',
  '仁王 3 (Nioh 3) 前期快速打空敵人精力條方法.md': 'nioh3-early-ki-depletion-guide',
  '仁王 3 (Nioh 3) 前期武器選擇與屬性加點推薦.md': 'nioh3-early-weapons-and-stats',
  '仁王 3 (Nioh 3) 大太刀地掃斬詳細開荒教學.md': 'nioh3-odachi-early-guide',
  '仁王 3 (Nioh 3) 新手遊玩技巧講解.md': 'nioh3-beginner-tips',
  '仁王 3 (Nioh 3) 開荒必知道的14個小技巧.md': 'nioh3-early-14-tips',
  '仁王3手斧怎么玩？最强加点与无限番鹰流派全攻略.md': 'nioh3-hatchet-flying-hawk-build',
  '地獄武技全解析與神技推薦.md': 'nioh3-hell-martial-skills',
  '忍者開荒武器、配點、技能、裝備.md': 'nioh3-ninja-early-guide',
  '忍者雙刀.md': 'nioh3-ninja-dual-swords',
  '手斧「無腦群狼流」.md': 'nioh3-hatchet-wolf-pack-build',
  '旋棍「無限精力輪椅流」.md': 'nioh3-shalg-infinite-ki-build'
};

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
      meta[key] = value;
    }
  }
  return meta;
}

function stringifyYAML(meta) {
  return Object.entries(meta)
    .map(([key, val]) => `${key}: ${JSON.stringify(val)}`)
    .join('\n');
}

function determineCategories(filename) {
  const name = filename.toLowerCase();
  
  // Rule for builds
  if (name.includes('bd') || name.includes('配裝') || name.includes('配装') || name.includes('流派') || name.includes('輪椅') || name.includes('二周目') || name.includes('定身') || name.includes('影縫') || name.includes('套裝') || name.includes('套装')) {
    if (name.includes('開荒') || name.includes('新手') || name.includes('前期') || name.includes('無腦') || name.includes('輪椅流')) {
      return { category: 'build', subcategory: 'beginner-builds' };
    }
    return { category: 'build', subcategory: 'endgame-builds' };
  }
  
  if (name.includes('開荒') || name.includes('新手') || name.includes('加點') || name.includes('加点') || name.includes('前期') || name.includes('懶人包')) {
    return { category: 'guide', subcategory: 'beginner' };
  }
  
  if (name.includes('精力') || name.includes('武技') || name.includes('打空') || name.includes('機制') || name.includes('評價') || name.includes('评价')) {
    return { category: 'guide', subcategory: 'systems' };
  }
  
  return { category: 'guide', subcategory: 'misc' };
}

function processFiles() {
  console.log('[Preprocess] Scanning pending files...');
  const files = fs.readdirSync(pendingDir);
  const mdFiles = files.filter(f => f.endsWith('.md'));
  
  console.log(`[Preprocess] Found ${mdFiles.length} markdown files.`);
  
  for (const file of mdFiles) {
    const filePath = path.join(pendingDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Strip BOM
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.substring(1);
    }
    
    const frontmatterMatch = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);
    let mdBody = content;
    let meta = {};
    
    if (frontmatterMatch) {
      meta = parseYAML(frontmatterMatch[1]);
      mdBody = content.replace(/^---[\s\S]+?---/, '').trim();
    }
    
    // Supplement nioh3 metadata
    meta.game = 'nioh3';
    meta.gameTitle = '仁王 3 (Nioh 3)';
    meta.gameCover = '/images/nioh3/cover.jpg';
    meta.gameDescription = '仁王 3 (Nioh 3) 官方與社群攻略 WIKI';
    
    // Assign unique clean English ID
    const assignedId = nioh3IdsMap[file];
    if (assignedId) {
      meta.id = assignedId;
    } else {
      // Fallback
      meta.id = 'nioh3-' + path.basename(file, '.md').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (meta.id === 'nioh3-') {
        // pure Chinese fallback to hash
        const hash = require('crypto').createHash('md5').update(file).digest('hex').slice(0, 8);
        meta.id = `nioh3-art-${hash}`;
      }
    }
    
    if (!meta.title) {
      meta.title = path.basename(file, '.md');
    }
    if (!meta.date) {
      meta.date = new Date().toISOString().split('T')[0];
    }
    if (!meta.author) {
      meta.author = '社群精華整理';
    }
    if (!meta.source) {
      meta.source = 'https://forum.gamer.com.tw/';
    }
    
    // Assign categories
    const categories = determineCategories(file);
    if (!meta.category) meta.category = categories.category;
    if (!meta.subcategory) meta.subcategory = categories.subcategory;
    
    // Re-serialize
    const newYAML = stringifyYAML(meta);
    const newContent = `---\n${newYAML}\n---\n\n${mdBody}`;
    
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`[Preprocess] Handled: ${file} -> id: ${meta.id}, category: ${meta.category}, subcategory: ${meta.subcategory}`);
  }
  
  console.log('[Preprocess] Done!');
}

processFiles();
