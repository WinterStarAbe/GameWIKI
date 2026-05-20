# GameWIKI Local Learnings Journal

## 🚨 [BUG] SPA Hash Router Parameter Collisions with Nested Hash Anchors
**日期：** 2026-05-19
**徵兆：** 
當使用者在文章頁面點擊右側 TOC 目錄錨點連結時（URL 變更為 `#/stoneshard/article/beginner-guide#basic-controls`），路由匹配程序會將 `beginner-guide#basic-controls` 辨識為 `:articleId` 參數，導致 AJAX 請求載入 `beginner-guide#basic-controls.json` 失敗並拋出 404 錯誤，畫面崩潰。

**根因：** 
`src/utils/router.js` 在解析 `window.location.hash` 時，僅去除了最前方的 `#`，便直接使用 `/` 來切分路由段（path parts）。如果 URL 中帶有第二個作為頁面錨點的 `#`，它會被包含在最後一個路徑分段中，導致參數解析錯誤。

**解決：** 
修改 `src/utils/router.js`，在切分路由分段前先利用 `.split('#')[0]` 將 nested hash 錨點後方內容剝離：
```javascript
const hash = window.location.hash.slice(1) || '/';
const pathWithoutAnchor = hash.split('#')[0];
const pathParts = pathWithoutAnchor.split('?')[0].split('/').filter(Boolean);
```
這能確保參數只保留 `beginner-guide`。而 `src/pages/Article.js` 仍然可以通過 `window.location.hash.split('#')[2]` 獲取原本的錨點值並進行平滑滾動。

**預防：** 
在任何 SPA 的前端雜湊（Hash）路由解析中，如果系統同時支援「路徑路由」與「頁面內錨點（Anchor）」，必須在比對路由參數前，優先過濾掉非路由相關的錨點段，避免污染變數。

---

## ⚖️ [DECISION] 巨型攻略去重合併與 Wiki 模組化拆分
**日期：** 2026-05-19
**背景：** 
Stoneshard 攻略中，0.9.2、0.9.3 和 0.9.4 三個版本皆有重複性極高的巨型長篇新手指南。如果物理拼接成一篇文章，不僅可讀性差、圖片加載緩慢，且右側 TOC 混亂，不便於檢索。

**選項：** 
- **方案一**：保留巨型實體拼接頁面，僅在單頁內部以大標題區分。
- **方案二**：按版本（0.9.2/0.9.3/0.9.4）分批發布成多篇文章。
- **方案三**：由 AI 進行跨版本語意比對、去重，並將其依核心玩法解構拆分為 6 篇主題獨立、輕量化的精準 Wiki 文章。

**理由：** 
選擇 **方案三**。Stoneshard 雖然版本迭代，但底層機制（如烹飪、篷車、醫療）是一致的，去重與解構能消除重複資訊。拆分後生成的 `beginner-guide`、`caravan-guide`、`cooking-guide`、`dungeon-guide`、`economy-guide`、`medical-guide` 單頁載入速度快，且能為每個主題配置完美對應的右側 TOC。

**重啟條件：** 
若未來遊戲發布大改版，導致某項系統（如大篷車系統）被完全重構，則需重新評估是否需要增加版本子分頁。

---

## 🚨 [BUG] JS/JSON Wiki 攻略生成源腳本修改時的字元匹配失效
**日期：** 2026-05-19
**徵兆：**
在嘗試使用 `replace_file_content` 修改 `tools/modularize_guides.js` 中的攻略指南範本時，多次回傳 `target content not found in file` 匹配失敗錯誤。

**根因：**
1. 繁體中文標點符號微小差異：原始碼中使用了全形句號 `。`，而在寫入修改目標時誤用了半形句號 `.`。
2. 語意字元不一致：原始碼中為 `最划算的方式`，在修改目標中誤寫為 `最安全的方式`，導致精準匹配引擎失效。

**解決：**
1. 縮減 `replace_file_content` 的比對範圍，僅針對 `comments` 陣列或關鍵代碼段進行精確的局部行替換，避免比對整段 Markdown 大文字。
2. 在比對前，先使用 `view_file` 仔細確認目標行之全形/半形符號與用詞（如「最划算」、「秸稈」），確保無任何字元偏差。

**預防：**
對於包含大量中文攻略文字的 JS 範本檔，修改時應採取「最小化修改區塊」原則。儘量只針對特定變數的陣列或屬性（例如僅替換 `comments: []`）進行精確變更，避免大段 Markdown 內容的比對以防止字元不一致引發的失敗。

---

## ⚖️ [DECISION] 巴哈精華留言清洗與模組化合流
**日期：** 2026-05-20
**背景：** 
Stoneshard 社群大長文（0.9.2/0.9.3/0.9.4）中含有大量網友在留言區分享的零散但極具價值的玩法心得（如附魔系統重構預測、秘法換位救人質、地牢容器重生機制、邊界剝皮等）。這些資訊若不及時整合，容易隨時間遺失或形成知識孤島。

**選項：** 
- **方案一**：以獨立留言板或單獨區塊呈現留言。
- **方案二**：直接過濾精簡，並模組化合流。將通用原理直接寫入攻略 Sections 的對應段落，並將具備個人色彩或版本預測的留言存入 JSON 資料庫的 `comments` 陣列。

**理由：** 
選擇 **方案二**。將客觀的遊戲玩法（如倉庫遠端傳送、乾草轉飼料等）融合進系統說明中能提供最直觀的閱讀體驗，而有個人玩法色彩的黑科技（如秘法蟲洞救援）與具時效性的預測（如未來改版附魔系統重構）則作為評論/補充留言呈現，不僅能尊重原作權益（註明巴哈網友出處），也讓 Wiki 系統呈現多樣化與動態感。

**重啟條件：** 
若未來有新的大批攻略被導入，或前端 UI 新增專門的「玩家留言板」組件，則需評估是否需要重構 comments 的結構。


## 🚨 [BUG] Windows 環境下 Node.js 讀取帶有 UTF-8 BOM 檔案導致 YAML Frontmatter 正則匹配失效
**日期：** 2026-05-20
**徵兆：**
使用 PowerShell 寫入的 Markdown 檔案，在執行 Ingest 時，`rawContent.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/)` 匹配失敗，且 frontmatter 沒有被剝除，直接殘留在內容中。

**根因：**
PowerShell 的 `Set-Content -Encoding utf8` 寫入的 UTF-8 檔案預設會包含 Byte Order Mark (BOM, 0xFEFF)。在 Node.js 中讀取為 string 時，BOM 作為第一個字元（`\uFEFF`），導致正則匹配中的開頭定位點 `^---` 匹配失敗。

**解決：**
在讀取並解析 Markdown 內容前，先檢查並切除開合的 BOM：
```javascript
if (rawContent.charCodeAt(0) === 0xFEFF) {
  rawContent = rawContent.substring(1);
}
```

**預防：**
In Windows 環境上開發 Node.js 檔案解析工具時，只要涉及字首匹配（如 `^`）或純文字讀取，必須優先清理 UTF-8 BOM，以避免匹配失效。

---

## ⚖️ [DECISION] 基於 navigatedCount 的前端安全路由回退機制 (safeBack)
**日期：** 2026-05-20
**背景：**
在 SPA 應用中，若使用者在瀏覽器新開分頁直接訪問深層 URL（如特定文章），此時瀏覽器歷史紀錄為空。如果使用者點擊頁面上的「返回」按鈕，直接執行 `history.back()` 會無效或將使用者踢出本網站，嚴重破壞導航體驗。

**選項：**
- **方案一**：只使用簡單的 `window.history.back()`，不做任何防範處理。
- **方案二**：直接綁定寫死的靜態上一級跳轉（例如文章頁返回按鈕永遠跳轉回分類頁）。
- **方案三**：在 `Router` 中追蹤 navigated 頁次（`navigatedCount`），實作安全返回方法 `safeBack(slug, category, subcategory)`。若歷史大於 1，執行 `history.back()`；若為 0 則根據參數層級，引導至相應的上一級節點。

**理由：**
選擇 **方案三**。方案三能兼顧「回退至上一造訪頁」與「按內容結構向上回退」的雙重需求。若使用者是從搜尋結果跳入文章，返回時能正確退回搜尋結果頁（方案二做不到）；若使用者是直接開連結訪問，返回時能安全回到分類頁（方案一會失效），為無歷史紀錄的直接訪問提供防爆安全引導。

**重啟條件：**
如果未來路由系統改採 Browser History API（非 Hash 模式）或整合第三方路由框架，則需重新評估 navigatedCount 的計數機制。
