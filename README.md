# 连载工坊 · 独立项目(自用)

一个连载小说写作系统:设定库 / 语料库 / 大纲 / 节拍表 / 章节过稿 / 伏笔。
按书籍类型起草设定与描写,支持导入素材与导出备份。AI 能力由 Claude 接口驱动。
本工程不依赖 Claude 画布,可自己运行、上线。

## 准备

- Node.js 18 以上(`node -v` 确认)。
- 一个 Anthropic API key(https://console.anthropic.com 申请,按用量付费)。

## A. 本地开发

```bash
npm install
cp .env.example .env          # 编辑 .env,填入你自己的 ANTHROPIC_API_KEY
npm run dev                   # 同时起前端(5173)和代理(8787)
# 打开 http://localhost:5173
```

## B. 收进版本库(让它成为一个真正的项目)

```bash
git init
git add -A
git commit -m "init: 连载工坊"
# 然后在 GitHub / Gitee 建一个私有仓库,把它推上去:
# git remote add origin <你的仓库地址>
# git push -u origin main
```
`.env` 已在 `.gitignore` 里,key 不会被提交。

## C. 上线(部署成一个随处可访问的服务)

本工程是**单一服务**:打包后,后端 `server.js` 既转发 AI 请求(藏 key),
又托管前端。所以上线只需跑一个 Node 进程。

先本地验证生产形态:

```bash
npm run build                 # 产出 dist/
npm start                     # 单服务启动
# 打开 http://localhost:8787  (前端 + /api 同源,无需再开代理)
```

部署到任意 Node 托管平台(Render / Railway / Fly,或一台小服务器),配置:

- **Build 命令**:`npm install && npm run build`
- **Start 命令**:`npm start`(即 `node server.js`)
- **环境变量**:`ANTHROPIC_API_KEY = <你的 key>`(平台后台设置,别写进代码)
- 平台通常会注入 `PORT`,`server.js` 已读取 `process.env.PORT`,无需改动。

部署完你会拿到一个网址,任何设备打开即用,key 始终只在服务端。

## 关于数据(自用场景的实情)

- 数据存在**浏览器本地(localStorage)**,因此是**按浏览器/设备各存各的、不跨设备同步**。
- 跨设备或换电脑时,用侧栏左下角的**「导出备份」**存成 JSON 文件,在新设备**「导入备份」**还原。
- 想要真正的多设备自动同步,需要把存储搬到服务端(再加一道简单口令保护,避免网址公开后被人读写)。这一步本工程暂未做——需要时可以加。

## 目录

```
wzj-studio/
├─ server.js            单服务:AI 代理 + 托管前端
├─ vite.config.js       开发时 /api 代理到 8787
├─ tailwind.config.js / postcss.config.js
├─ index.html
├─ .env.example         复制成 .env 填 key
└─ src/
   ├─ main.jsx          入口,先装 storage 再挂载
   ├─ storage.js        localStorage 适配
   ├─ index.css         Tailwind 指令
   └─ App.jsx           主程序(六大模块 + 导出/导入备份)
```

## key 安全

`.env` 在 `.gitignore` 里,别提交;线上用平台环境变量。不要把 key 写进前端或公开仓库。
