# GameWIKI - 技術規格與開發手冊 (SPEC.md)

本文件詳述 GameWIKI 專案的底層資料庫模型設計、自訂前端路由機制、TOC 錨點平滑滾動系統以及數據攝入管線（Ingest Pipeline）的運作邏輯。

---

## 💾 1. 資料庫模型設計 (JSON Database Schemas)

本專案採用無伺服器的輕量靜態 JSON 作為資料儲存庫。所有資料庫結構存放在根目錄的 `data/` 下，共分為四個主要層次：

### 1.1 全局遊戲列表 (`data/games.json`)
紀錄系統所支持的所有遊戲項目與基本元數據。
```json
{
  "games": [
    {
      "slug": "stoneshard", // 遊戲唯一標識，對應路由與資料夾名稱
      "title": "紫色晶石 (Stoneshard)", // 遊戲顯示名稱
      "cover": "/images/stoneshard/cover.jpg", // 遊戲封面圖相對路徑
      "description": "中世紀開放世界回合制 RPG", // 遊戲簡短描述
      "articleCount": 5, // 文章總數
      "lastUpdated": "2026-05-02" // 最後更新日期
    }
  ]
}
```

### 1.2 遊戲自訂分類與設定 (`data/[game_id]/game.json`)
定義該款遊戲在 Wiki 頁面所採用的分類（Categories）、子分類（Subcategories）以及顯示圖示。
```json
{
  "slug": "stoneshard",
  "title": "紫色晶石 (Stoneshard)",
  "categories": {
    "guide": { // 分類 slug
      "label": "攻略教學", // 分類顯示標籤
      "icon": "📖", // 分類圖示
      "description": "新手教學、系統介紹等固定內容",
      "subcategories": [ // 子分類列表
        { "slug": "beginner", "label": "新手入門" },
        { "slug": "systems", "label": "系統機制" }
      ]
    },
    "build": {
      "label": "流派配置",
      "icon": "⚔️",
      "subcategories": [
        { "slug": "melee", "label": "近戰流派" }
      ]
    }
  }
}
```

### 1.3 遊戲文章索引 (`data/[game_id]/index.json`)
作為特定遊戲的目錄索引。每次新增、刪除或修改文章時，必須同步更新此索引以利列表頁渲染。
```json
[
  {
    "id": "beginner-guide", // 文章唯一識別碼，對應 JSON 檔名
    "title": "【新手入門】基本操作、存檔與生存製作指南",
    "author": "社群精華整理",
    "date": "2026-05-19",
    "gameVersion": "0.9.4+", // 遊戲版本適用標記
    "category": "guide", // 對應 game.json 的分類 slug
    "subcategory": "beginner", // 對應 game.json 的子分類 slug
    "tags": ["新手", "基礎", "存檔", "操作"] // 標籤列表
  }
]
```

### 1.4 文章內容與留言結構 (`data/[game_id]/articles/[article_id].json`)
定義文章的詳細內容、章節目錄（TOC）及社群精選留言。
```json
{
  "id": "beginner-guide",
  "title": "【新手入門】基本操作、存檔與生存製作指南",
  "author": "社群精華整理",
  "source": "https://forum.gamer.com.tw/...", // 原文連結出處
  "date": "2026-05-19",
  "gameVersion": "0.9.4+",
  "category": "guide",
  "subcategory": "beginner",
  "tags": ["新手", "基礎"],
  "toc": [ // 右側章節目錄錨點
    {
      "id": "basic-controls", // 段落 HTML 錨點 ID
      "title": "基本操作與捷徑按鍵" // TOC 顯示標題
    }
  ],
  "sections": [ // 具體段落內容
    {
      "id": "basic-controls",
      "title": "基本操作與捷徑按鍵",
      "content": "### 容易被忽略的基本操作按鍵\n\n* **移動畫面**：長按 滑鼠中鍵..." // Markdown 格式的段落內容
    }
  ],
  "comments": [ // 精選留言/玩家黑科技補充
    {
      "author": "abcf123",
      "content": "錢袋可以當作投擲物，扔出去可以造成傷害...",
      "useful": true,
      "tags": ["趣味玩法", "投擲技巧"]
    }
  ]
}
```

---

## 🛣️ 2. 前端路由與 TOC 滾動機制 (Router & TOC)

### 2.1 自訂 Hash Router
專案在 `src/utils/router.js` 實作了基於雜湊的前端路由。為了避免動態參數與靜態路徑發生衝突，路由匹配遵循 **「靜態優先、變數在後」** 的原則。
```javascript
// 路由表定義 (src/main.js)
const routes = [
  { path: '/', handler: renderHome },
  { path: '/:slug', handler: renderGameHome },
  { path: '/:slug/article/:articleId', handler: renderArticle }, // 帶有靜態字串的路徑必須放在前面
  { path: '/:slug/:cat/:subcat', handler: renderCategoryList }  // 帶有全變數的路徑放在後面
];
```

### 2.2 Nested Hash (雙重 Hash) 錨點去衝突
當使用者點擊文章右側目錄（TOC）時，URL 會變更為如 `#/stoneshard/article/beginner-guide#save-system`。這會產生第二個 `#` 號。
為了防止路由系統將第二個 `#` 以後的內容誤判為路由參數的一部分而導致 404 崩潰，系統在解析路徑時採用了以下去衝突方案：

1. **路由匹配前過濾**：
   在 `src/utils/router.js` 中，匹配路由前先利用 `split('#')[0]` 將第二個 hash 及其後續的錨點段剝離，僅保留純粹路由路徑：
   ```javascript
   const hash = window.location.hash.slice(1) || '/';
   const pathWithoutAnchor = hash.split('#')[0]; // 僅保留 /stoneshard/article/beginner-guide
   const pathParts = pathWithoutAnchor.split('?')[0].split('/').filter(Boolean);
   ```

2. **頁面內平滑滾動**：
   在 `src/pages/Article.js` 載入完成後，透過 `split('#')[2]` 獲取剛才被剝離的錨點標識（如 `save-system`），並藉由 `scrollIntoView` 手動實施平滑跳轉：
   ```javascript
   setTimeout(() => {
     const hash = window.location.hash.split('#')[2]; // 獲取 "save-system"
     if (hash) {
       const el = document.getElementById(hash);
       if (el) el.scrollIntoView({ behavior: 'smooth' });
     }
   }, 100);
   ```

---

## 🛠️ 3. 數據管線與工具腳本 (Ingest Pipeline)

為便於從巴哈姆特等哈啦板或論壇將玩家寫的大長文攻略無縫搬移至 Wiki，專案在 `tools/` 提供了一套數據轉換工具鏈。

### 3.1 圖片本地化偵測：`tools/ingest.js`
- **功能**：掃描 `inbox/pending/` 中的待處理 Markdown 檔案，將外部圖片網址通過 MD5 加密為唯一檔名並下載至 `/images/stoneshard/` 下以防圖床破圖，並為 AI 進一步格式化做準備。

### 3.2 攻略合流與結構化轉換：`tools/merge_guides.js`
- **功能**：自動將多個版本的攻略檔案（例如 0.9.2, 0.9.3, 0.9.4）進行合流，自動下載文中所有圖片、將圖片路徑替換成 `/images/stoneshard/beginner-guide/` 本地相對路徑，隨後產生對應的文章 JSON 並自動更新 `data/[game_id]/index.json`。
- **執行方式**：
  ```bash
  node tools/merge_guides.js
  ```

### 3.3 巨型長文去重與模組化拆分：`tools/modularize_guides.js`
- **功能**：當攻略含有極高重複度的巨型段落時，該腳本負責跨版本語意比對去重，並將其依核心機制（大篷車、醫療、經濟）解構，重新拆分為主題獨立、輕量化的精準 Wiki 文章。

---

## ➕ 4. 新增遊戲或攻略文章開發指引

### 4.1 如何新增一款遊戲
若要在 Wiki 系統中引入一款新遊戲（例如 `nioh3`）：
1. **更新全局列表**：在 `data/games.json` 的 `games` 陣列中新增一個對象，指定其 `slug` 為 `nioh3`。
2. **建立遊戲目錄**：在 `data/` 下新建 `nioh3/` 及 `nioh3/articles/` 資料夾。
3. **建立遊戲分類定義**：在 `data/nioh3/` 下新建 `game.json`，自定義該遊戲所屬的分類與子分類。
4. **初始化索引**：在 `data/nioh3/` 下新建空的索引檔 `index.json`（內容寫入 `[]`）。
5. **添加封面圖**：將封面圖存放在 `/public/images/nioh3/cover.jpg`。

### 4.2 如何手動新增一篇攻略文章
1. **撰寫 JSON**：在 `data/[game_id]/articles/` 下建立新的 `[article-id].json` 檔案。
2. **編排 Sections 與 TOC**：按照 `1.4` 的結構將攻略正文切分成多個段落，並同步編寫 `toc` 錨點。
3. **更新索引**：在 `data/[game_id]/index.json` 中，將該文章的基本屬性（ID、標題、作者、日期、分類等）以新對象追加至陣列末尾。
4. **確認圖片**：如文章有圖片，應存放在 `public/images/[game_id]/[article-id]/` 目錄，並在 JSON 正文中以 `![alt](/images/[game_id]/[article-id]/img_name.jpg)` 相對路徑引用。
5. **刷新驗證**：運行 `npm run dev`，在瀏覽器中進入該遊戲頁面，即可看到新文章已被自動加載且路由可正常匹配跳轉。

