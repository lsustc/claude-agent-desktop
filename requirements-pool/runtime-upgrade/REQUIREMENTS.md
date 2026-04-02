# Runtime 架构升级 Requirements

> Status: Planning
> Created: 2026-04-03
> Priority: High

---

## 1. 问题陈述

### 当前局限性

**1.1 中栏主题字色过淡**

中栏 `RailSection` 的 section 标题（"工作台"/"功能页"）使用 `var(--text-faint)` 颜色（`MainView.tsx:455`），在深色主题下过于暗淡，不易辨识。

**1.2 生成的页面缺少专业行情组件**

Agent 生成的 widget 页面只能使用 ECharts/Chart.js 等通用图表库（`modules/chart.md`），缺少专业金融行情组件（K 线图、分时图、五档盘口等）。MCP modules 中没有 HXKline 行情组件的使用文档，Agent 不知道如何调用。同时 CSP 白名单（`main/index.ts:48-56`）未包含 `s.thsi.cn` 域名。

**1.3 Agent 生成页面不会自动新建，只会覆盖**

当 Agent 调用 `show_widget` 时（`generative-ui.ts:72-105`），widget 仅作为 StreamEvent 发送到渲染器临时展示在 Stage 上。不会在功能页列表自动创建新条目。用户需要手动点击"保存为功能页"按钮（`MainView.tsx:309-319`）才能持久化。下一次生成会覆盖上一次的临时展示。

**1.4 Session 与工作台强绑定**

当前每个工作台创建时自动绑定一个 Session（`runtime-store.ts:995`），1:1 关系。左侧对话区展示的是当前选中工作台绑定的 Session 历史。这导致：
- 无法用一个 Session 操作多个工作台/页面
- 无法在不同工作台间共享对话上下文
- Session 历史过长时，无法新建 Session 继续操作同一工作台
- 删除工作台会连带删除 Session（`ipc-handlers.ts:55-56`）

**1.5 页面无版本管理**

功能页的 `widgetCode` 字段（`types.ts:42`）只存储最新一份代码。每次更新直接覆盖，无法回溯历史版本。

### 痛点

1. 中栏 section 标题字色太淡，不易区分区域
2. 生成的页面不够专业，缺少真实行情数据可视化
3. Agent 每次生成新内容会覆盖旧内容，无法自动积累多页面
4. Session 被绑死在工作台上，灵活性差
5. 页面更新后无法回退到之前的版本

---

## 2. 需求列表

### R1: 中栏主题字色优化

| ID | 需求描述 | 优先级 |
|----|----------|--------|
| R1.1 | 提高中栏 section 标题（"工作台"/"功能页"等）的字色对比度，使其在深色主题下清晰可辨 | P1 |

### R2: HXKline 行情组件集成

| ID | 需求描述 | 优先级 |
|----|----------|--------|
| R2.1 | CSP 白名单新增 `s.thsi.cn`（script-src、style-src、connect-src、font-src） | P0 |
| R2.2 | 在 `src/main/mcp-tools/modules/` 下新增行情组件文档（如 `kline.md`），包含 HXKlineChart 和 HXKline 的 CDN 引入方式、授权配置、初始化 API、数据格式、K 线/分时图创建示例 | P0 |
| R2.3 | 预置授权信息（projectId: `hxkline-F10_StockInfoF10_page`，token 已提供） | P0 |
| R2.4 | `read_me` 工具的 modules 枚举中新增 `kline` 选项 | P0 |
| R2.5 | 使用生产数据域 `China`（`HXKline.setProjectMode('China')`） | P1 |

**CDN 地址：**
```html
<script crossorigin src="//s.thsi.cn/cd/b2cweb-component-hxkline-front/index.1.2.3.js"></script>
<script crossorigin src="//s.thsi.cn/cd/b2cweb-component-hxklinechart-front/index.2.1.3.js"></script>
```

### R3: Session 与工作台解耦 + 系统化操作

| ID | 需求描述 | 优先级 |
|----|----------|--------|
| R3.1 | Session 独立存在，不与任何工作台绑定。移除 `WorkspaceMeta.sessionId` 字段 | P0 |
| R3.2 | 新增系统化 MCP Tools 供 Agent 操作工作台和页面（见下方详细列表） | P0 |
| R3.3 | 用户发消息时，自动将当前激活的工作台 + 页面数据注入 Agent 上下文（作为 system prompt 追加或首条消息） | P0 |
| R3.4 | 用户切换选中的工作台/页面时，后续消息自动携带新的上下文 | P0 |
| R3.5 | 用户可随时新建 Session（对话历史太长时），新 Session 自动继承当前 UI 激活状态 | P1 |
| R3.6 | Session 列表需要 UI 入口，支持切换和管理 | P1 |
| R3.7 | 删除工作台时不再连带删除 Session | P1 |
| R3.8 | 斜杠命令更新：`/new` → 新建 Session；`/history` → Session 历史列表；新增 `/workspace` 新建工作台；新增 `/page` 在当前工作台下新建页面；`/settings` 不变 | P0 |

**系统化 MCP Tools：**

| Tool 名称 | 参数 | 行为 |
|-----------|------|------|
| `create_workspace` | title, kind?, focus? | 新建工作台，返回 workspace 信息 |
| `select_workspace` | workspaceId | 切换 UI 激活的工作台 |
| `create_page` | title, kind?, widgetCode? | 在当前激活工作台下新建页面 |
| `select_page` | pageId | 切换 UI 激活的页面 |
| `update_page` | pageId?, widgetCode, title? | 更新指定页面（默认当前激活页面）的 widget 代码，创建新版本 |
| `get_context` | — | 获取当前激活工作台 + 页面的完整数据 |

### R4: 页面版本管理

| ID | 需求描述 | 优先级 |
|----|----------|--------|
| R4.1 | 每次 `update_page` / `show_widget` 更新页面时，将新的 widgetCode 保存为新版本（而非覆盖） | P0 |
| R4.2 | 默认展示最新版本的 widget | P0 |
| R4.3 | 用户可以在 Stage 区域切换查看旧版本 | P1 |
| R4.4 | 版本列表显示创建时间，方便用户识别 | P2 |

### R5: show_widget 自动创建页面

| ID | 需求描述 | 优先级 |
|----|----------|--------|
| R5.1 | 保留 `show_widget` 工具，当 Agent 调用时自动在当前激活工作台下创建新功能页 | P0 |
| R5.2 | 页面标题由 `show_widget` 的 `title` 参数决定，用户可后续修改 | P0 |
| R5.3 | 如果 Agent 调用的是 `update_page`，则更新已有页面（不新建） | P0 |

---

## 3. 架构概览

### 目标架构

```
Session（独立）
  │
  ├── 通过系统化 MCP Tools 操作 ──→ 工作台（Workspace）
  │                                    └── 页面（Page/Artifact）
  │                                          └── 版本（Version）
  │
  └── 自动注入当前激活的工作台+页面上下文
```

### 组件职责

| 组件 | 位置 | 职责 |
|------|------|------|
| Runtime Store | `src/main/runtime-store.ts` | 工作台/页面/版本 CRUD + 持久化 |
| Session Store | `src/main/session-store.ts` | 独立 Session 管理（不再与 Workspace 绑定） |
| Agent Manager | `src/main/agent-manager.ts` | Session 启动、上下文注入、MCP Tools 注册 |
| Generative UI | `src/main/mcp-tools/generative-ui.ts` | show_widget + 新增系统化 Tools |
| MCP Modules | `src/main/mcp-tools/modules/` | 新增 kline.md 行情组件文档 |
| MainView | `src/renderer/components/MainView.tsx` | 中栏字色优化、版本切换 UI |
| useRuntime | `src/renderer/hooks/useRuntime.ts` | 前端状态管理适配 |
| useChat | `src/renderer/hooks/useChat.ts` | Session 独立管理 |
| IPC Handlers | `src/main/ipc-handlers.ts` | 新增 IPC 通道 |
| Preload | `src/preload/index.ts` | 暴露新 API |
| Types | `src/shared/types.ts` | 类型定义更新 |

---

## 4. 影响的文件

### 新增文件

| 文件 | 用途 |
|------|------|
| `src/main/mcp-tools/modules/kline.md` | HXKline 行情组件使用文档 |

### 修改文件

| 文件 | 变更内容 |
|------|----------|
| `src/shared/types.ts` | 移除 `WorkspaceMeta.sessionId`；RuntimeArtifact 新增版本相关字段 |
| `src/shared/ipc-channels.ts` | 新增 Session 管理、上下文注入相关 IPC 通道 |
| `src/main/runtime-store.ts` | 移除 Workspace-Session 绑定逻辑；新增页面版本管理 |
| `src/main/session-store.ts` | Session 独立化，不再随 Workspace 创建/删除 |
| `src/main/agent-manager.ts` | 上下文自动注入；MCP Tools 注册变更 |
| `src/main/mcp-tools/generative-ui.ts` | 新增系统化 Tools（create_workspace/page、select、update_page 等）；read_me 枚举新增 kline |
| `src/main/ipc-handlers.ts` | 新增 Session 管理、工作台/页面操作的 IPC handler |
| `src/main/config-store.ts` | allowedTools 新增系统化 Tools；CSP 需要的配置 |
| `src/main/index.ts` | CSP 白名单加入 `s.thsi.cn` |
| `src/preload/index.ts` | 暴露新增 API |
| `src/renderer/components/MainView.tsx` | 中栏字色优化；版本切换 UI；Session 管理入口 |
| `src/renderer/hooks/useRuntime.ts` | 移除 Workspace-Session 绑定逻辑；适配新架构 |
| `src/renderer/hooks/useChat.ts` | Session 独立管理 |

---

## 5. 验收标准

1. 中栏 section 标题在深色主题下清晰可辨
2. Agent 生成的 widget 页面可以包含 HXKline K 线图和分时图，行情数据正常加载
4. Agent 调用 `show_widget` 时自动在当前工作台下创建新功能页
5. Agent 可以通过 `update_page` 更新已有页面，不新建
6. Agent 可以通过系统化 Tools 新建/选中工作台和页面
7. Session 独立于工作台，用户可随时新建 Session
8. 用户发消息时，当前激活的工作台+页面数据自动作为上下文传给 Agent
9. 页面每次更新产生新版本，默认展示最新版本
10. 用户可以在 Stage 切换查看旧版本

---

## 6. 不在范围内

- 多用户协作
- 页面模板市场
- 行情数据本地缓存/离线模式
- 工作台导入/导出
- Agent 自主创建子 Agent
