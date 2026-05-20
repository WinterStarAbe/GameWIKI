# GameWIKI - 本地遊戲攻略 WIKI 系統

GameWIKI 是一個基於純靜態 JSON 資料結構的輕量化、本地端遊戲攻略 WIKI 系統。專案採用現代前端技術構建，具備精美的玻璃擬物風（Glassmorphism）介面、流暢的前端 SPA 路由，以及自動化的數據處理管線。目前已完整收錄並模組化拆分了《紫色晶石 (Stoneshard)》的社群精華攻略與玩家評論。

---

## 🚀 核心特色

- 🌟 **極致視覺體驗**：精心設計的玻璃擬物風介面，搭配精心調配的和諧色彩，提供卓越的閱讀與操作視覺感受。
- ⚡ **前端 SPA 路由**：基於 Vanilla JS 實現的自訂 Hash Router。支援首頁、遊戲主頁、分類列表及文章詳情頁面，並具備 Nested Hash 錨點去衝突機制，保障 TOC (目錄) 點擊跳轉平滑流暢。
- 📖 **客製化 Markdown 渲染**：整合 `marked`、`dompurify` 與 `highlight.js`，提供安全、美觀且具備程式碼高亮的文章閱讀體驗。
- ⚙️ **輕量化靜態資料庫**：完全基於 JSON 檔案的資料模型設計，零資料庫依賴，便於版本控制與本地修改。
- 🛠️ **增量數據管線 (Ingest Pipeline)**：提供自動化腳本，能一鍵將 Markdown 格式的攻略文件（例如從巴哈姆特下載的攻略網頁）進行去水、圖片本地化下載、格式合流，並自動打包寫入 JSON 庫。

---

## 🛠️ 技術棧

- **核心架構**：HTML5, JavaScript (ES6+), Vanilla CSS
- **前端建置與開發**：Vite (v8.x)
- **樣式系統**：Tailwind CSS (v3.4.19)
- **解析與安全**：
  - [marked](https://github.com/markedjs/marked) - Markdown 解析器
  - [dompurify](https://github.com/cure53/DOMPurify) - HTML 安全過濾
- **輔助庫**：
  - [highlight.js](https://github.com/highlightjs/highlight.js) - 程式碼語法高亮
  - [fuse.js](https://github.com/krisk/Fuse) - 全文搜尋引擎 (預備擴展使用)

---

## 📂 專案目錄結構

```text
GameWIKI/
├── .learnings/           # 本地開發日誌與決策紀錄 (LEARNINGS.md, ERRORS.md)
├── data/                 # 靜態 JSON 資料庫
│   ├── games.json        # 全局遊戲列表
│   └── stoneshard/       # 特定遊戲資料目錄
│       ├── game.json     # 遊戲分類與子分類定義
│       ├── index.json    # 遊戲文章索引
│       └── articles/     # 具體文章的結構化 JSON 資料
├── inbox/                # 數據攝入暫存區
│   ├── pending/          # 待處理的原始攻略 Markdown 檔案
│   └── processed/        # 已處理完成的攻略備份
├── public/               # 靜態資源目錄
│   └── images/           # 本地化下載的遊戲攻略圖片
├── src/                  # 前端原始碼
│   ├── pages/            # 頁面渲染邏輯 (Home, GameHome, CategoryList, Article)
│   ├── utils/            # 路由 (router.js) 與資料加載 (dataLoader.js)
│   ├── index.css         # 全局樣式與 Tailwind 配置
│   └── main.js           # 專案程式進入點
├── tools/                # 數據處理與 Ingest Pipeline 工具腳本
│   ├── ingest.js         # 偵測暫存區與下載圖片工具
│   ├── merge_guides.js   # 攻略合流與本地化圖片下載腳本
│   └── modularize_guides.js # 巨型長文拆分與語意去重核心腳本
├── index.html            # SPA 主頁面 HTML 模板
├── package.json          # 專案依賴與腳本配置
├── postcss.config.js     # CSS 後處理器配置
├── tailwind.config.js    # Tailwind 樣式自訂配置
└── vite.config.js        # Vite 編譯與開發伺服器配置
```

---

## 🏁 快速開始

### 1. 安裝依賴項目
在專案根目錄下執行以下指令以安裝所需套件：
```bash
npm install
```

### 2. 啟動開發伺服器
運行本地開發伺服器，預設將在 `http://localhost:5173` 啟動（或依專案配置）：
```bash
npm run dev
```

### 3. 建置生產版本
編譯並打包專案以供部署：
```bash
npm run build
```

---

## 💡 貢獻與開發指南

若您需要新增攻略文章或擴展新的遊戲，請詳細查閱 [專案規格與開發手冊 (SPEC.md)](file:///e:/WorkSpace/GameWIKI/SPEC.md)。
有關本專案歷次重大的技術決策與 BUG 修復紀錄，請參閱：
- [本地學習日誌 (.learnings/LEARNINGS.md)](file:///e:/WorkSpace/GameWIKI/.learnings/LEARNINGS.md)
- [錯誤修復紀錄 (.learnings/ERRORS.md)](file:///e:/WorkSpace/GameWIKI/.learnings/ERRORS.md)
- Obsidian 專案進度追蹤：`E:\WorkSpace\我的筆記\01_專案\GameWIKI\status.md`

