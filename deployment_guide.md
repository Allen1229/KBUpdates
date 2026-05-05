# 金銀島知識庫更新小幫手 - 部署與設定指南

這份指南將引導你完成工具的最後設定與部署。

## 1. Google Cloud 設定 (用於 AI API 授權)

為了讓工具能安全地使用你的 Google 帳號進行 AI 分析，請執行以下步驟：

1.  前往 [Google Cloud Console](https://console.cloud.google.com/)。
2.  建立新專案或選擇現有專案。
3.  前往 **API 與服務 > 常規**，點擊「啟用 API 和服務」，搜尋並啟用 **Generative Language API**。
4.  前往 **API 與服務 > OAuth 同意畫面**：
    *   選擇 **外部** (或如果你是內部組織則選內部)。
    *   填寫必要的應用程式名稱與電子郵件。
    *   在「範圍」中新增：`https://www.googleapis.com/auth/generative-language`。
5.  前往 **API 與服務 > 憑證**：
    *   點擊「建立憑證」 > **OAuth 2.0 用戶端 ID**。
    *   應用程式類型選擇 **網頁應用程式**。
    *   **已授權的 JavaScript 來源**：
        *   開發時：`http://localhost:5173`
        *   部署後：你的 GitHub Pages 或 Cloudflare Pages 網址 (例如 `https://kb-helper.pages.dev`)。
    *   點擊「建立」後，複製產生的 **用戶端 ID (Client ID)**，並填入工具的設定中。

---

## 2. Google Apps Script (GAS) 部署

確保你的 Google Sheet 腳本已發佈為 **網頁應用程式 (Web App)**：

1.  在 Google Sheet 中開啟「擴充功能 > Apps Script」。
2.  點擊「部署 > 新部署」。
3.  類型選擇 **網頁應用程式**。
4.  **執行身分**：你自己。
5.  **誰有權存取**：**任何人** (這很重要，否則前端無法呼叫)。
6.  部署後複製產生的 `Web App URL`，分別填入工具中的「問題總攬」與「遊戲資訊」欄位。

---

## 3. 部署到 Cloudflare Pages (推薦) 或 GitHub

既然你提到之後可能會搭配 Cloudflare，我強烈推薦使用 **Cloudflare Pages**：

### 推薦：Cloudflare Pages
1.  將程式碼上傳到 GitHub 儲存庫。
2.  在 Cloudflare 控制台選擇 **Pages > Connect to Git**。
3.  選擇你的儲存庫。
4.  建置設定：
    *   Framework preset: **Vite**
    *   Build command: `npm run build`
    *   Build output directory: `dist`
5.  點擊部署即可。

### 手動上傳到 GitHub (Drag and Drop)
1.  在本地執行 `npm run build`。
2.  這會產生一個 `dist` 資料夾。
3.  在 GitHub 建立儲存庫，點擊 "Upload files"。
4.  將 `dist` 資料夾內的所有內容（不是資料夾本身，是內容）拖拉進去。
5.  在設定中開啟 **GitHub Pages**。

---

## 4. 工具使用小撇步
*   **API Key 備援**：如果你不想用 Google 登入，也可以直接在設定填入 API Key。這會存在你的瀏覽器 localStorage 中，不會流出。
*   **截圖貼上**：在左側文字框直接 `Ctrl+V` 就可以貼上剪貼簿的截圖，AI 會自動辨識文字內容。
*   **自動累積**：寫入成功後，畫面會自動清空並更新上方筆數統計，方便連續輸入。
