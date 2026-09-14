# Chess Online

兩人線上西洋棋。建立房間後，將六碼房間 ID 分享給對手即可開始。

## 本機執行

```bash
npm install
npm start
```

在瀏覽器開啟 `http://localhost:3000`。以兩個瀏覽器視窗建立與加入同一個房間，即可測試雙人對戰。

## 部署到 Render

1. 將此資料夾推送至 GitHub repository。
2. 在 Render 建立 **New > Blueprint**，選擇該 repository。
3. Render 會讀取 `render.yaml`，安裝依賴並以 `npm start` 啟動服務。
4. 部署完成後，將 Render 提供的網址分享給玩家。

所有玩家都必須使用同一個網址；房間資料暫時儲存在伺服器記憶體中，服務重啟或任一玩家離線後，該房間會結束。
