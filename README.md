# Vellum

只读 Markdown 阅读器。复杂 Mermaid 图可以点击全屏、滚轮缩放、拖拽平移。

## 用法

- 打开本地 `.md` 文件，或直接粘贴
- 点击任意 Mermaid 图进入全屏查看
- 滚轮缩放，拖拽平移，双击或复位按钮适应窗口
- `Ctrl/Cmd + O` 打开文件，`Ctrl/Cmd + V` 粘贴

## 本地 / CI

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run build:tauri
```

- `.github/workflows/web.yml`：类型检查、网页生产构建、Tauri 前端静态包
- `.github/workflows/tauri.yml`：在 macOS / Windows / Ubuntu runner 上编桌面安装包

## 桌面套壳（Tauri）

阅读器本身是网页应用。`src-tauri/` 是原生窗口壳，`npm run build:tauri` 产出给壳加载的静态前端（`dist/`）。

出安装包不需要本机装 Rust：把仓库推到 GitHub 后，在 Actions 里手动跑 **Tauri**，或打 `v0.1.0` 这种 tag。产物会出现在 workflow 产物或 Draft Release 里。

本机若要调试原生窗口：

```bash
# 需要 Rust：https://v2.tauri.app/start/prerequisites/
npm run tauri dev
npm run tauri build
```

当前包未签名。macOS 可能要在「隐私与安全性」里允许打开；Windows 可能被 SmartScreen 拦一次。
