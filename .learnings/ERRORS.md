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
