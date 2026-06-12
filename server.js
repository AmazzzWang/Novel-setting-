// 单一服务:既转发 AI 请求(藏 key),又托管打包好的前端。
// 开发用 `npm run dev`(前端+代理分开跑);上线用 `npm run build` 后 `npm start`。
import express from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 8787;
const KEY = process.env.ANTHROPIC_API_KEY;

// —— AI 代理:补上 key 再转发到 Anthropic ——
app.post("/api/messages", async (req, res) => {
  if (!KEY) {
    return res.status(500).json({ error: { message: "服务端没读到 ANTHROPIC_API_KEY,检查环境变量 / .env。" } });
  }
  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) {
    res.status(502).json({ error: { message: "转发失败:" + e.message } });
  }
});

// —— 生产:托管打包好的前端(dist 存在时才挂,避免开发态报错)——
const dist = path.join(__dirname, "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, () => console.log(`服务已启动:http://localhost:${PORT}`));
