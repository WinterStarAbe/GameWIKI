## 🚨 [BUG] Git index.lock 鎖定錯誤
**日期：** 2026-05-20
**徵兆：** 執行 `git commit` 時報錯 `fatal: Unable to create '.../.git/index.lock': File exists.`。
**根因：** 由於伺服器重啟或 Git 指令被中斷，導致 `index.lock` 檔案未被正常清理，鎖定了 Git 倉庫。
**解決：** 執行 `Remove-Item -Path "e:\WorkSpace\GameWIKI\.git\index.lock" -Force` 強制刪除該鎖定檔，隨後即可正常執行 `git commit`。
**預防：** 遇到 Git 突然中斷而無法執行後續操作時，檢查並清理 `.git/` 目錄下的 `.lock` 檔案。

## 🚨 [BUG] Windows 下 UTF-8 BOM 導致 YAML Frontmatter 解析失敗
**日期：** 2026-05-20
**徵兆：** Ingest Pipeline 在執行時，讀取 markdown 檔案卻匹配不到 `^---` 的 YAML 標頭，且 frontmatter 內文殘留在簡介 section 中。
**根因：** Windows 下 PowerShell 或其它編輯器寫入的 UTF-8 檔案常帶有 BOM (0xFEFF)，Node.js 讀取後的第一個字元為 `\uFEFF`，導致 `^` 定位正則表達式匹配失敗。
**解決：** 讀取檔案後，若 `rawContent.charCodeAt(0) === 0xFEFF`，使用 `substring(1)` 將其移除。
**預防：** 在 Windows 環境解析字串首部標記時，務必先行移除 BOM。

---

## 🚨 [BUG] package.json 檔案帶有 UTF-8 BOM 導致 PostCSS & Vite 建置失敗
**日期：** 2026-05-21
**徵兆：**
執行 `npm run build` 時建置中斷，拋出錯誤 `Failed to load PostCSS config ... SyntaxError: Unexpected token '﻿', "﻿{\n  \"name\"... is not valid JSON`。

**根因：**
專案中的 `package.json` 檔案在先前的操作或由某些編輯器寫入時帶有 UTF-8 Byte Order Mark (BOM, `efbbbf`)。PostCSS / Vite 在讀取該 JSON 檔並使用 `JSON.parse` 解析時，開頭的 BOM 字元 (`\uFEFF`) 會引發 Unexpected Token 的解析語法錯誤。

**解決：**
利用 Node.js 讀取 `package.json` 內容，使用 `replace(/^\uFEFF/, '')` 將 BOM 消除後，重新以無 BOM 格式寫入檔案。

**預防：**
對於系統設定與依賴檔（如 `package.json`），寫入時必須使用標準無 BOM UTF-8 編碼；解析各類設定檔前應加入 BOM 去除的防禦性處理。

---

## 🚨 [BUG] Ingest Pipeline 中中文檔名 regex 替換導致 articleId 衝突覆蓋
**日期：** 2026-05-21
**徵兆：**
在批次導入大量包含中文檔名的 Markdown 攻略時，最終生成的 JSON 檔案僅有 13 個，而原始 Markdown 檔案有 26 個。大量的 JSON 檔名與 ID 都變成了 `-.json`、`-3-nioh-3-.json`，導致資料在寫入時相互覆蓋而丟失。

**根因：**
`tools/ingest_workflow.js` 在生成 `articleId` 時，使用了 `path.basename(file, '.md').toLowerCase().replace(/[^a-z0-9]+/g, '-')`。因為中文與中文字元（如「《」、「【」等標點）均非 `a-z0-9`，在正則替換下會被全部置換為 `-`。當檔名為純中文時，ID 即變成 `-`，造成所有純中文攻略文章的 ID 衝突覆蓋。

**解決：**
1. 在執行 Ingest 之前，利用 `tools/preprocess_nioh3.js` 對文章進行預處理。
2. 在腳本中建立一個完整的 `中文檔名 ➔ 唯一乾淨英文 ID` 對照 Map，並主動在 Markdown 開頭寫入 `id` Frontmatter（例如 `id: "nioh3-shalg-spin-bd"`）。
3. Ingest Pipeline 在執行時，會優先採用 `meta.id`，從而避免了基於中文檔名的 Regex 替換。

**預防：**
在任何需要將檔名轉化為 URL ID 或檔名 ID 的 Node.js 系統中，如果涉及多語言（如中文）檔名，絕不能單純地用 `replace(/[^a-z0-9]/g, ...)`，應：
- 建立拼音/英文對照映射，或
- 採用 MD5/UUID 加上部分關鍵字做 fallback hash，或
- 採用安全的 urlencode 以支援多語言路徑。

---

## 🚨 [BUG] GDrive 隨選檔案實體化過程中因 Move-Item 更名導致 WriteAllText 覆寫為空
**日期：** 2026-05-21
**徵兆：**
Stoneshard 攻略文章在 Ingest 過程中，檔案大小被覆寫成 0 或 3 位元組的空檔案，導致內容丟失且無法成功導入。

**根因：**
1. 由於 Windows 上 Google Drive File-on-Demand (隨選檔案) 的特殊屬性，Node.js `fs.readdirSync` 無法直接列出虛擬路徑中的檔案。
2. 為了實體化檔案，先前的 Agent 在 PowerShell 中執行了 `Move-Item` 將檔案移出並改名為 `stoneshard_equip.md`。
3. 移出改名後，後續的實體化寫入指令 `WriteAllText` 在 PowerShell 雙引號下，搜尋 Filter 仍使用舊的中文名稱（例如 `*裝備與附魔*`）。因為檔案此時已更名，`Get-ChildItem` 找不到任何檔案，導致傳遞給 `WriteAllText` 的內容變數為空，最終將已移過去的 `stoneshard_equip.md` 覆寫成了空檔案。

**解決：**
1. 提示使用者透過 Google Drive 網頁版的「版本歷史紀錄（Version History）」功能還原被覆寫的檔案。
2. 在 Node.js 中處理隨選檔案時，避免使用脆弱的 PowerShell pipeline 進行改名與覆寫；應直接使用 Node.js 的 `fs.readFileSync` 直接指定檔名讀取（直接讀取會觸發 OS 底層的 Google Drive 客戶端自動下載實體檔案），再寫入目的地。

**預防：**
- 避免使用 PowerShell 進行複雜的「檔案實體化與改名」管線操作，易因檔案改名與過濾條件不一致導致變數為空而覆寫檔案。
- 讀取雲端隨選檔案時，直接以 Node.js 讀取具體路徑即可觸發 hydration (下載)，不需先用 Powershell 移走。
