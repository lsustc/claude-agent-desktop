# Claude Agent Desktop

基于 Electron + React + Claude Agent SDK 的桌面 AI Agent 应用。核心特色是内联 Generative UI 渲染（图表、仪表盘、交互组件），通过 morphdom 实现类似 Claude.ai 官网的可视化效果。

English version: [README.en.md](./README.en.md)

---

## 功能特性

### AI 对话
- 多轮对话，支持 Claude Opus / Sonnet / Haiku 模型切换
- 流式文本输出 + 富 Markdown 渲染（代码高亮、表格、公式）
- 思考过程展示（可折叠）
- 多会话管理（创建、切换、删除、自动标题）

### Generative UI（核心差异化）
- HTML Widget 内联渲染在对话流中，非 iframe 沙箱
- morphdom DOM diff 实现渐进式"生长"动画
- 支持 CDN 加载外部库（ECharts、Chart.js、D3、Mermaid 等）
- CSS 变量主题系统，支持亮色/暗色模式
- 自定义 MCP 工具：`read_me`（按需加载模块文档）+ `show_widget`（HTML 渲染）
- 5 类模块模板：图表、流程图、交互组件、UI 原型、SVG 艺术

### 工具调用展示
- 可折叠工具调用卡片，按工具类型差异化渲染
  - Bash：终端风格（黑底绿字命令提示符）
  - Edit：红绿 diff 对比
  - Read/Write：文件内容预览
- 彩色图标区分工具类型

### 配置管理
- **认证方式**：订阅登录（`claude login` OAuth）或 API Key
- **MCP 服务器**：添加、删除、启停外部 MCP 服务器
- **子 Agent**：自定义 Agent 定义（名称、描述、提示词、工具权限）
- **工具权限**：按分类启停各工具
- **系统提示词**：可自定义编辑
- **暗色模式**：开关切换，跟随系统偏好

---

## 架构设计

```
Electron Main Process（主进程）
  ├── AgentManager        SDK query() 封装 + MessageQueue 多轮对话
  ├── ConfigStore         electron-store 持久化配置
  ├── SessionStore        会话和消息管理
  ├── MCP Tools           show_widget + read_me（Generative UI）
  ├── IPC Handlers        contextBridge 安全 API
  └── index.ts            窗口管理、CSP、PATH 修复、外链拦截

Electron Preload（预加载）
  └── contextBridge       安全暴露 API（对话、配置、MCP）

Electron Renderer（渲染进程 - React）
  ├── App.tsx             根组件 + ErrorBoundary
  ├── Sidebar             会话列表 + 新建会话 + 设置入口
  ├── ChatView            消息列表 + 输入区域
  ├── MessageRenderer     按事件类型分发到不同渲染器
  ├── MarkdownMessage     react-markdown + GFM + typography
  ├── WidgetRenderer      morphdom 渐进式 HTML 渲染
  ├── ToolCallCard        工具调用卡片（可折叠）
  ├── ThinkingBlock       思考过程（可折叠）
  └── Settings            Tab 面板（通用 / MCP / Agent / 工具权限）
```

### 数据流

```
用户输入消息
  → IPC → AgentManager.sendMessage()
    → MessageQueue.push() → SDK query() 异步迭代器
      → stream_event 检测到 show_widget → 发送 loading 状态
      → assistant 完整消息 → processSDKMessage() 转换
        → StreamEvent → IPC → Renderer
          → MessageRenderer → WidgetRenderer（morphdom 渲染）
                            → MarkdownMessage（排版渲染）
                            → ToolCallCard（工具卡片）
```

### Generative UI 渲染管线

```
Claude 调用 show_widget({ widget_code: "<style>...<div>...<script>..." })
  → agent-manager 通过 stream_event 检测到工具调用 → 发送 loading 状态
  → 完整 widget_code 到达 → StreamEvent { isStreaming: false }
  → WidgetRenderer 接收:
    1. buildProgressiveChunks() 将 HTML 拆分为 N 个渐进块
    2. 每块通过 morphdom diff 注入 DOM，块间有短暂延迟
    3. 新元素从下方淡入（translateY + opacity 动画）
    4. 全部 HTML 渲染完毕后，按顺序执行 <script> 标签
    5. CDN 脚本（如 ECharts）加载完成 → 触发内联脚本初始化图表
```

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 33 + electron-vite 3 |
| 前端 | React 19 + TypeScript |
| 样式 | Tailwind CSS 3 + @tailwindcss/typography |
| AI 核心 | @anthropic-ai/claude-agent-sdk 0.2.83 |
| Widget 渲染 | morphdom 2.7 |
| Markdown | react-markdown + remark-gfm + rehype-raw |
| 持久化 | electron-store 10 |
| Schema | zod 4 |

---

## 快速开始

### 前置条件

- Node.js 18+
- Claude Code CLI（用于订阅登录）：
  ```bash
  npm install -g @anthropic-ai/claude-code
  claude login
  ```

### 安装运行

```bash
cd claude-agent-desktop
npm install
npm run dev
```

### 认证方式

**方式一：订阅登录（推荐，无 API 费用）**

1. 终端运行 `claude login`（一次性 OAuth 登录）
2. 打开应用 → Settings → 选择 "Subscription" → Save
3. 使用 Claude Pro/Max/Team 订阅配额

**方式二：API Key**

1. 从 [console.anthropic.com](https://console.anthropic.com) 获取密钥
2. 打开应用 → Settings → 选择 "API Key" → 粘贴密钥 → Save
3. 按用量计费

### 打包分发

```bash
npm run build:mac    # macOS .dmg
npm run build:win    # Windows .exe
npm run build:linux  # Linux .AppImage
```

---

## 项目结构

```
claude-agent-desktop/
├── electron-vite.config.ts          # Electron + Vite 构建配置
├── tailwind.config.ts               # Tailwind + typography 插件
├── package.json
├── src/
│   ├── main/                        # Electron 主进程
│   │   ├── index.ts                 # 应用入口、窗口、CSP、外链拦截
│   │   ├── agent-manager.ts         # SDK 集成、MessageQueue、流式处理
│   │   ├── message-handler.ts       # SDK 消息 → StreamEvent 转换
│   │   ├── config-store.ts          # 持久化配置（electron-store）
│   │   ├── session-store.ts         # 会话和消息管理
│   │   ├── ipc-handlers.ts          # IPC 处理器注册
│   │   └── mcp-tools/
│   │       ├── generative-ui.ts     # show_widget + read_me 工具定义
│   │       └── modules/             # Widget 模块文档（chart/diagram 等）
│   ├── preload/
│   │   └── index.ts                 # contextBridge 安全 API
│   ├── renderer/                    # React 前端
│   │   ├── App.tsx                  # 根组件 + ErrorBoundary
│   │   ├── main.tsx                 # 入口 + 暗色模式初始化
│   │   ├── hooks/useChat.ts         # 对话状态管理
│   │   ├── components/
│   │   │   ├── Sidebar.tsx          # 会话列表
│   │   │   ├── ChatView.tsx         # 消息列表 + 输入框
│   │   │   ├── MessageRenderer.tsx  # 事件类型路由
│   │   │   ├── MarkdownMessage.tsx  # Markdown 渲染（typography + GFM）
│   │   │   ├── WidgetRenderer.tsx   # morphdom 渐进式渲染器
│   │   │   ├── ToolCallCard.tsx     # 工具调用卡片
│   │   │   ├── ThinkingBlock.tsx    # 思考过程展示
│   │   │   └── settings/           # 设置面板各 Tab
│   │   └── styles/globals.css       # Tailwind + Widget CSS 变量
│   └── shared/
│       ├── types.ts                 # StreamEvent、SessionMeta、AppConfig
│       └── ipc-channels.ts         # IPC 通道常量
└── out/                             # 构建输出
```

---

## Generative UI 模块

`read_me` 工具按需加载模块文档，指导 Claude 生成高质量 Widget：

| 模块 | 用途 | 可用库 |
|------|------|--------|
| `chart` | 仪表盘、KPI 卡片、柱状/折线/饼图 | ECharts、Chart.js |
| `diagram` | 流程图、架构图、组织结构图 | SVG、Mermaid |
| `interactive` | 计算器、转换器、问答、表单 | 原生 JS |
| `mockup` | 移动端/桌面端 UI 原型 | 纯 CSS |
| `art` | SVG 插画、图案、动画 | SVG、CSS 动画 |

### 触发示例

```
"用可视化方式展示一个仪表盘"         → chart 模块
"画一个系统架构图"                   → diagram 模块
"做一个 BMI 计算器"                  → interactive 模块
"展示一个手机 App 原型"              → mockup 模块
"创建一个动态 SVG 图案"              → art 模块
```

---

## 设计决策

- **morphdom 而非 iframe**：Widget 直接渲染在对话 DOM 中（与 Claude.ai Generative UI 一致），支持 CSS 变量主题和无缝集成
- **渐进式渲染**：HTML 被拆分为多个块，通过 morphdom diff 逐步注入 DOM，配合淡入动画产生"生长"视觉效果
- **SDK 内联，CLI 外置**：Agent SDK 被 bundle 到 `out/main/index.js`，但运行时通过 `pathToClaudeCodeExecutable` 调用 `node_modules` 下的 `cli.js` 子进程
- **订阅认证**：不设置 `ANTHROPIC_API_KEY` 时，SDK 自动从 macOS Keychain 读取 `claude login` 存储的 OAuth token

---

## 许可证

MIT
