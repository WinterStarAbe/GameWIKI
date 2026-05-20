## 🚨 [BUG] Git index.lock 鎖定錯誤
**日期：** 2026-05-20
**徵兆：** 執行 `git commit` 時報錯 `fatal: Unable to create '.../.git/index.lock': File exists.`。
**根因：** 由於伺服器重啟或 Git 指令被中斷，導致 `index.lock` 檔案未被正常清理，鎖定了 Git 倉庫。
**解決：** 執行 `Remove-Item -Path "e:\WorkSpace\GameWIKI\.git\index.lock" -Force` 強制刪除該鎖定檔，隨後即可正常執行 `git commit`。
**預防：** 遇到 Git 突然中斷而無法執行後續操作時，檢查並清理 `.git/` 目錄下的 `.lock` 檔案。
