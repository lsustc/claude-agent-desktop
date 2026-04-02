import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { sessionStore } from './session-store'
import type {
  ArtifactKind,
  ModelType,
  RuntimeArtifact,
  WorkspaceDetail,
  WorkspaceKind,
  WorkspaceMeta
} from '../shared/types'

interface RuntimeData {
  workspaces: WorkspaceDetail[]
}

const SEED_KEYS = {
  openingWorkspace: 'seed:workspace:opening-desk',
  openingArtifact: 'seed:artifact:opening-dashboard',
  semiconductorWorkspace: 'seed:workspace:semiconductor-desk',
  semiconductorArtifact: 'seed:artifact:semiconductor-f10',
  screeningWorkspace: 'seed:workspace:screening-desk',
  screeningArtifact: 'seed:artifact:growth-watchlist'
} as const

const SEED_MAPPINGS = [
  {
    workspaceKey: SEED_KEYS.openingWorkspace,
    workspaceTitle: '开盘驾驶舱',
    artifactKey: SEED_KEYS.openingArtifact,
    artifactTitle: '今日开盘台',
    artifactKind: 'dashboard' as const
  },
  {
    workspaceKey: SEED_KEYS.semiconductorWorkspace,
    workspaceTitle: '半导体链路台',
    artifactKey: SEED_KEYS.semiconductorArtifact,
    artifactTitle: '半导体行业 F10',
    artifactKind: 'industry_map' as const
  },
  {
    workspaceKey: SEED_KEYS.screeningWorkspace,
    workspaceTitle: '策略选股台',
    artifactKey: SEED_KEYS.screeningArtifact,
    artifactTitle: '高弹性成长观察列表',
    artifactKind: 'watchlist' as const
  }
] as const

function moveItem<T extends { id: string }>(items: T[], sourceId: string, targetId: string): T[] {
  const sourceIndex = items.findIndex((item) => item.id === sourceId)
  const targetIndex = items.findIndex((item) => item.id === targetId)

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return items
  }

  const nextItems = [...items]
  const [moved] = nextItems.splice(sourceIndex, 1)
  nextItems.splice(targetIndex, 0, moved)
  return nextItems
}

const DATA_SNAPSHOT_LABEL = '2026-04-01 取自 iFind MCP'
const DATA_SNAPSHOT_ISO = '2026-04-01T15:40:00+08:00'

function getRuntimeDir(): string {
  const dir = join(app.getPath('userData'), 'runtime')
  mkdirSync(dir, { recursive: true })
  return dir
}

function getRuntimePath(): string {
  return join(getRuntimeDir(), 'workspaces.json')
}

function buildWidgetFrame(title: string, subtitle: string, body: string): string {
  return `
<style>
  @font-face {
    font-family: 'THSJinRongTi';
    src: url(https://s.thsi.cn/cd/ths-frontend-common-lib-container/v1.3.6/common/font/THSJinRongTi-Regular.otf);
  }
  .rt-root {
    width: 100%;
    min-height: 100%;
    color: var(--widget-text);
    background:
      radial-gradient(circle at top right, color-mix(in oklab, #ffb86b 16%, transparent), transparent 30%),
      radial-gradient(circle at bottom left, color-mix(in oklab, #d14b34 12%, transparent), transparent 26%),
      color-mix(in oklab, var(--widget-surface) 94%, #fff4e4 6%);
    border: 1px solid var(--widget-border);
    border-radius: 30px;
    padding: 30px;
    display: flex;
    flex-direction: column;
    gap: 22px;
    box-sizing: border-box;
    font-family: "THSJinRongTi", "PingFang SC", "SF Pro Display", sans-serif;
    position: relative;
    overflow: hidden;
  }
  .rt-root::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(to right, color-mix(in oklab, var(--widget-border) 44%, transparent) 1px, transparent 1px),
      linear-gradient(to bottom, color-mix(in oklab, var(--widget-border) 38%, transparent) 1px, transparent 1px);
    background-size: 24px 24px;
    opacity: 0.18;
  }
  .rt-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 18px;
    padding-bottom: 20px;
    border-bottom: 1px solid color-mix(in oklab, var(--widget-border) 88%, #cf7d3e 12%);
    position: relative;
    z-index: 1;
  }
  .rt-title {
    margin: 0 0 8px;
    font-size: clamp(30px, 3.8vw, 42px);
    line-height: 1.04;
    font-weight: 600;
    letter-spacing: -0.045em;
  }
  .rt-subtitle {
    margin: 0;
    max-width: 760px;
    color: color-mix(in oklab, var(--widget-text) 72%, #8c5d34 28%);
    font-size: 14px;
    line-height: 1.7;
  }
  .rt-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid color-mix(in oklab, var(--widget-accent) 24%, var(--widget-border));
    border-radius: 999px;
    padding: 8px 13px;
    font-size: 12px;
    color: color-mix(in oklab, var(--widget-accent) 76%, #8c4a1f 24%);
    background: color-mix(in oklab, var(--widget-accent) 10%, transparent);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .rt-grid {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 18px;
    position: relative;
    z-index: 1;
  }
  .rt-card {
    grid-column: span 4;
    border: 1px solid color-mix(in oklab, var(--widget-border) 84%, #d58a54 16%);
    border-radius: 24px;
    padding: 19px;
    background:
      linear-gradient(180deg, color-mix(in oklab, var(--widget-surface) 90%, #fff8ee 10%), color-mix(in oklab, var(--widget-surface) 96%, #f5e7d5 4%));
  }
  .rt-card--wide {
    grid-column: span 8;
  }
  .rt-card--full {
    grid-column: span 12;
  }
  .rt-k {
    margin: 0 0 10px;
    color: color-mix(in oklab, var(--widget-text) 54%, #8f5c36 46%);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }
  .rt-v {
    margin: 0;
    font-size: 28px;
    line-height: 1;
    font-weight: 600;
    letter-spacing: -0.03em;
  }
  .rt-list {
    margin: 0;
    padding-left: 18px;
    color: color-mix(in oklab, var(--widget-text) 84%, #71492d 16%);
    font-size: 14px;
    line-height: 1.75;
  }
  .rt-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  .rt-table th,
  .rt-table td {
    text-align: left;
    padding: 11px 0;
    border-bottom: 1px solid color-mix(in oklab, var(--widget-border) 88%, #c58b62 12%);
  }
  .rt-table th {
    color: color-mix(in oklab, var(--widget-text) 56%, #8d6039 44%);
    font-size: 12px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .rt-pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .rt-pill {
    border-radius: 999px;
    border: 1px solid color-mix(in oklab, var(--widget-border) 80%, #ca7d40 20%);
    padding: 7px 12px;
    font-size: 12px;
    color: color-mix(in oklab, var(--widget-text) 82%, #764425 18%);
    background: color-mix(in oklab, #fff6ea 74%, transparent);
  }
  .rt-up {
    color: #c53a2c;
  }
  .rt-down {
    color: #2b8a57;
  }
  .rt-flat {
    color: color-mix(in oklab, var(--widget-text) 72%, #806043 28%);
  }
  .rt-quote-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
  }
  .rt-quote {
    border-radius: 22px;
    padding: 16px;
    border: 1px solid color-mix(in oklab, var(--widget-border) 84%, #cb8750 16%);
    background: linear-gradient(180deg, color-mix(in oklab, #fff7ee 84%, transparent), color-mix(in oklab, #f6ead9 92%, transparent));
  }
  .rt-quote-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 10px;
  }
  .rt-quote-name {
    font-size: 16px;
    line-height: 1.2;
  }
  .rt-quote-code {
    font-size: 11px;
    color: color-mix(in oklab, var(--widget-text) 56%, #8d6039 44%);
    letter-spacing: 0.08em;
  }
  .rt-quote-price {
    font-size: 26px;
    line-height: 1;
    letter-spacing: -0.05em;
    margin-bottom: 6px;
  }
  .rt-quote-meta {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    color: color-mix(in oklab, var(--widget-text) 70%, #775338 30%);
  }
  .rt-spark {
    margin-top: 12px;
    width: 100%;
    height: 58px;
    display: block;
  }
  .rt-band {
    display: grid;
    gap: 10px;
  }
  .rt-band-row {
    display: grid;
    grid-template-columns: 110px 1fr 62px;
    gap: 10px;
    align-items: center;
  }
  .rt-band-label,
  .rt-band-value {
    font-size: 13px;
  }
  .rt-band-track {
    height: 8px;
    border-radius: 999px;
    background: color-mix(in oklab, #edd7bf 84%, transparent);
    overflow: hidden;
  }
  .rt-band-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #e28d38, #c8452f);
  }
  .rt-surface-strong {
    border-radius: 28px;
    padding: 22px;
    border: 1px solid color-mix(in oklab, #d77b34 34%, var(--widget-border));
    background:
      radial-gradient(circle at top left, color-mix(in oklab, #f9d27a 14%, transparent), transparent 34%),
      linear-gradient(180deg, color-mix(in oklab, #fff0dc 86%, transparent), color-mix(in oklab, #f7e1cb 96%, transparent));
  }
  .rt-caption {
    font-size: 12px;
    line-height: 1.6;
    color: color-mix(in oklab, var(--widget-text) 62%, #8b603e 38%);
  }
  @media (max-width: 980px) {
    .rt-card,
    .rt-card--wide,
    .rt-card--full {
      grid-column: span 12;
    }
    .rt-quote-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .rt-band-row {
      grid-template-columns: 86px 1fr 50px;
    }
  }
  @media (max-width: 640px) {
    .rt-quote-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
<div class="rt-root">
  <div class="rt-header">
    <div>
      <h1 class="rt-title">${title}</h1>
      <p class="rt-subtitle">${subtitle}</p>
    </div>
    <div class="rt-badge">agent runtime</div>
  </div>
  ${body}
</div>
`
}

function buildMorningDashboardWidget(): string {
  return buildWidgetFrame(
    '今日开盘台',
    `数据快照：${DATA_SNAPSHOT_LABEL}。页面已替换为真实热点、真实股票、真实催化，不再是示意文案。`,
    `
<style>
  .rt-hero {
    display: grid;
    grid-template-columns: 1.6fr 1fr;
    gap: 18px;
  }
  .rt-hero-left {
    display: grid;
    gap: 16px;
  }
  .rt-headline-stack {
    display: grid;
    gap: 14px;
  }
  .rt-headline {
    border: 1px solid color-mix(in oklab, var(--widget-border) 84%, #c67e42 16%);
    border-radius: 24px;
    padding: 18px 20px;
    background:
      linear-gradient(135deg, color-mix(in oklab, #ffcd73 18%, transparent), transparent 46%),
      linear-gradient(180deg, color-mix(in oklab, #fff7ee 86%, transparent), color-mix(in oklab, #f7eadb 96%, transparent));
  }
  .rt-headline h3 {
    margin: 0 0 8px;
    font-size: 18px;
    line-height: 1.3;
    letter-spacing: -0.02em;
  }
  .rt-headline p {
    margin: 0;
    color: color-mix(in srgb, var(--widget-text) 82%, transparent);
    font-size: 14px;
    line-height: 1.65;
  }
  .rt-source {
    margin-top: 10px;
    font-size: 12px;
    color: color-mix(in oklab, var(--widget-text) 58%, #8e623e 42%);
  }
  .rt-signal {
    border-radius: 26px;
    padding: 22px;
    background:
      radial-gradient(circle at top right, color-mix(in oklab, #f9d27a 24%, transparent), transparent 42%),
      linear-gradient(180deg, color-mix(in oklab, #fff1df 84%, transparent), color-mix(in oklab, #f4dcc4 96%, transparent));
    border: 1px solid color-mix(in oklab, #d57f36 34%, var(--widget-border));
  }
  .rt-signal .rt-k {
    color: #9e561a;
  }
  .rt-signal-meter {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 14px;
  }
  .rt-signal-meter strong {
    font-size: 54px;
    line-height: 1;
    letter-spacing: -0.05em;
  }
  .rt-mini-note {
    font-size: 13px;
    line-height: 1.6;
    color: color-mix(in srgb, var(--widget-text) 70%, transparent);
  }
  .rt-time-grid {
    display: grid;
    gap: 12px;
  }
  .rt-radar {
    display: grid;
    gap: 12px;
    margin-top: 4px;
  }
  .rt-time-row {
    display: grid;
    grid-template-columns: 84px 1fr;
    gap: 14px;
    align-items: start;
  }
  .rt-time {
    font-size: 13px;
    color: var(--widget-accent);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .rt-time-row div:last-child {
    font-size: 14px;
    line-height: 1.65;
  }
  @media (max-width: 980px) {
    .rt-hero {
      grid-template-columns: 1fr;
    }
  }
</style>
<section class="rt-hero">
  <div class="rt-hero-left">
    <section class="rt-surface-strong">
      <p class="rt-k">market radar</p>
      <div class="rt-band">
        <div class="rt-band-row">
          <div class="rt-band-label">半导体设备</div>
          <div class="rt-band-track"><div class="rt-band-fill" style="width:84%"></div></div>
          <div class="rt-band-value rt-up">84</div>
        </div>
        <div class="rt-band-row">
          <div class="rt-band-label">AI算力映射</div>
          <div class="rt-band-track"><div class="rt-band-fill" style="width:88%"></div></div>
          <div class="rt-band-value rt-up">88</div>
        </div>
        <div class="rt-band-row">
          <div class="rt-band-label">材料修复</div>
          <div class="rt-band-track"><div class="rt-band-fill" style="width:61%"></div></div>
          <div class="rt-band-value rt-flat">61</div>
        </div>
        <div class="rt-band-row">
          <div class="rt-band-label">追涨风险</div>
          <div class="rt-band-track"><div class="rt-band-fill" style="width:72%"></div></div>
          <div class="rt-band-value rt-down">72</div>
        </div>
      </div>
      <p class="rt-caption">热度条基于 4 月 1 日真实资讯密度、设备链 ETF 叙事强度和核心票收盘表现整理，用来决定盘前聚焦顺序。</p>
    </section>
    <div class="rt-headline-stack">
      <article class="rt-headline">
        <h3>半导体双催化共振</h3>
        <p>4月1日，iFind 资讯显示“AI生态扩张与国产化突破 双重利好催化半导体板块”。核心线索是英伟达生态继续扩张，同时 SEMICON China 2026 释放国产设备新品密集落地信号。</p>
        <div class="rt-source">来源：同花顺资讯，2026-04-01</div>
      </article>
      <article class="rt-headline">
        <h3>国产设备链继续被资金定价</h3>
        <p>“AI算力+晶圆扩产双轮驱动，国产设备龙头业绩超预期”成为 4 月 1 日盘中主要传播叙事。资讯中直接点名北方华创、中芯国际、华海清科跟涨，说明市场把设备环节当作景气兑现主线。</p>
        <div class="rt-source">来源：ETF 盘中资讯，2026-04-01</div>
      </article>
      <article class="rt-headline">
        <h3>算力情绪对半导体形成映射增量</h3>
        <p>创业板人工智能 ETF 盘中反弹超 3%，报道提到智谱 2026 年一季度 API 调价 83% 后调用量仍增长 400%，说明应用侧需求没有退坡，盘前可以继续把半导体与算力当成联动而非割裂主题。</p>
        <div class="rt-source">来源：新浪财经，2026-04-01</div>
      </article>
    </div>
  </div>
  <aside class="rt-signal">
    <p class="rt-k">opening signal</p>
    <div class="rt-signal-meter">
      <strong>84</strong>
      <span>/ 100</span>
    </div>
    <p class="rt-mini-note">这不是量化指标，而是基于 4 月 1 日真实资讯和半导体核心票走势整理出的开盘优先级。结论是：设备链强于材料链，算力情绪会继续给半导体加 beta。</p>
    <ul class="rt-list">
      <li>优先看设备龙头是否继续稳住高位换手</li>
      <li>关注寒武纪这类高弹性 AI 映射标的是否延续 6.96% 强度</li>
      <li>不追过于拥挤的纯情绪扩散，先看龙头成交额与承接</li>
    </ul>
    <div class="rt-radar">
      <div class="rt-band-row">
        <div class="rt-band-label">龙头确认</div>
        <div class="rt-band-track"><div class="rt-band-fill" style="width:81%"></div></div>
        <div class="rt-band-value rt-up">81</div>
      </div>
      <div class="rt-band-row">
        <div class="rt-band-label">分支扩散</div>
        <div class="rt-band-track"><div class="rt-band-fill" style="width:58%"></div></div>
        <div class="rt-band-value rt-flat">58</div>
      </div>
    </div>
  </aside>
</section>
<div class="rt-grid">
  <section class="rt-card rt-card--wide">
    <p class="rt-k">quote strip</p>
    <div class="rt-quote-grid">
      <article class="rt-quote">
        <div class="rt-quote-head">
          <div>
            <div class="rt-quote-name">寒武纪</div>
            <div class="rt-quote-code">688256.SH</div>
          </div>
          <div class="rt-up">+6.96%</div>
        </div>
        <div class="rt-quote-price rt-up">1051.40</div>
        <div class="rt-quote-meta"><span>换手 2.39%</span><span>情绪领涨</span></div>
        <svg class="rt-spark" viewBox="0 0 160 58" preserveAspectRatio="none">
          <polyline fill="none" stroke="#c8452f" stroke-width="3" points="0,38 40,22 80,28 120,18 160,8" />
          <polyline fill="none" stroke="#c8452f" stroke-opacity="0.18" stroke-width="10" stroke-linecap="round" points="0,38 40,22 80,28 120,18 160,8" />
        </svg>
      </article>
      <article class="rt-quote">
        <div class="rt-quote-head">
          <div>
            <div class="rt-quote-name">中微公司</div>
            <div class="rt-quote-code">688012.SH</div>
          </div>
          <div class="rt-up">+2.34%</div>
        </div>
        <div class="rt-quote-price rt-up">313.54</div>
        <div class="rt-quote-meta"><span>换手 1.19%</span><span>设备中坚</span></div>
        <svg class="rt-spark" viewBox="0 0 160 58" preserveAspectRatio="none">
          <polyline fill="none" stroke="#d16434" stroke-width="3" points="0,40 40,42 80,26 120,34 160,18" />
          <polyline fill="none" stroke="#d16434" stroke-opacity="0.18" stroke-width="10" stroke-linecap="round" points="0,40 40,42 80,26 120,34 160,18" />
        </svg>
      </article>
      <article class="rt-quote">
        <div class="rt-quote-head">
          <div>
            <div class="rt-quote-name">北方华创</div>
            <div class="rt-quote-code">002371.SZ</div>
          </div>
          <div class="rt-up">+0.79%</div>
        </div>
        <div class="rt-quote-price rt-up">450.53</div>
        <div class="rt-quote-meta"><span>换手 0.87%</span><span>龙头锚点</span></div>
        <svg class="rt-spark" viewBox="0 0 160 58" preserveAspectRatio="none">
          <polyline fill="none" stroke="#e08c3f" stroke-width="3" points="0,24 40,36 80,12 120,30 160,26" />
          <polyline fill="none" stroke="#e08c3f" stroke-opacity="0.18" stroke-width="10" stroke-linecap="round" points="0,24 40,36 80,12 120,30 160,26" />
        </svg>
      </article>
      <article class="rt-quote">
        <div class="rt-quote-head">
          <div>
            <div class="rt-quote-name">沪硅产业</div>
            <div class="rt-quote-code">688126.SH</div>
          </div>
          <div class="rt-up">+2.07%</div>
        </div>
        <div class="rt-quote-price rt-up">17.25</div>
        <div class="rt-quote-meta"><span>换手 0.71%</span><span>材料温度计</span></div>
        <svg class="rt-spark" viewBox="0 0 160 58" preserveAspectRatio="none">
          <polyline fill="none" stroke="#cf7440" stroke-width="3" points="0,20 40,24 80,42 120,36 160,28" />
          <polyline fill="none" stroke="#cf7440" stroke-opacity="0.18" stroke-width="10" stroke-linecap="round" points="0,20 40,24 80,42 120,36 160,28" />
        </svg>
      </article>
    </div>
  </section>
  <section class="rt-card">
    <p class="rt-k">rhythm</p>
    <div class="rt-time-grid">
      <div class="rt-time-row">
        <div class="rt-time">09:20</div>
        <div>先看设备链龙头竞价强度，确认是继续主线还是只剩 ETF 叙事。</div>
      </div>
      <div class="rt-time-row">
        <div class="rt-time">10:30</div>
        <div>观察算力情绪是否继续外溢到半导体设计与设备，不急于追材料边缘分支。</div>
      </div>
      <div class="rt-time-row">
        <div class="rt-time">14:30</div>
        <div>如果北方华创和中微公司全天换手依旧克制，尾盘更适合看趋势资金回流。</div>
      </div>
    </div>
  </section>
  <section class="rt-card">
    <p class="rt-k">evidence tape</p>
    <ul class="rt-list">
      <li>2026-03-25: 存储扩产与先进封装升级带动设备需求释放</li>
      <li>2026-03-31: 设备自主化驱动高景气再被强化</li>
      <li>2026-04-01: AI 生态扩张与国产化突破形成双利好</li>
    </ul>
  </section>
  <section class="rt-card rt-card--full">
    <p class="rt-k">runtime focus</p>
    <div class="rt-pill-row">
      <span class="rt-pill">半导体设备</span>
      <span class="rt-pill">AI 算力映射</span>
      <span class="rt-pill">寒武纪</span>
      <span class="rt-pill">北方华创</span>
      <span class="rt-pill">中微公司</span>
      <span class="rt-pill">沪硅产业</span>
      <span class="rt-pill">中芯国际</span>
    </div>
  </section>
</div>
`
  )
}

function buildIndustryMapWidget(): string {
  return buildWidgetFrame(
    '半导体行业 F10',
    `数据快照：${DATA_SNAPSHOT_LABEL}。行业催化、代表股表现与估值均来自 iFind MCP 实时取数。`,
    `
<style>
  .rt-editorial {
    display: grid;
    grid-template-columns: 1.25fr 0.95fr;
    gap: 18px;
    margin-bottom: 16px;
  }
  .rt-panel {
    border: 1px solid color-mix(in oklab, var(--widget-border) 82%, #d38748 18%);
    border-radius: 26px;
    padding: 22px;
    background:
      linear-gradient(180deg, color-mix(in oklab, #fff8ef 88%, transparent), color-mix(in oklab, #f2e3d2 96%, transparent));
  }
  .rt-panel h3 {
    margin: 0 0 10px;
    font-size: 20px;
    line-height: 1.3;
    letter-spacing: -0.025em;
  }
  .rt-panel p {
    margin: 0;
    font-size: 14px;
    line-height: 1.75;
    color: color-mix(in srgb, var(--widget-text) 84%, transparent);
  }
  .rt-timeline {
    display: grid;
    gap: 14px;
  }
  .rt-timeline-item {
    display: grid;
    grid-template-columns: 92px 1fr;
    gap: 14px;
  }
  .rt-timeline-date {
    color: var(--widget-accent);
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .rt-timeline-copy {
    font-size: 14px;
    line-height: 1.65;
  }
  .rt-legend {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 999px;
    padding: 8px 12px;
    background: color-mix(in oklab, #f6b257 18%, transparent);
    color: #964d1d;
    font-size: 12px;
    letter-spacing: 0.04em;
  }
  @media (max-width: 980px) {
    .rt-editorial {
      grid-template-columns: 1fr;
    }
  }
</style>
<section class="rt-editorial">
  <article class="rt-panel">
    <div class="rt-legend">industry thesis</div>
    <h3>设备链是主线，算力情绪提供额外 beta，材料链更多扮演跟随修复</h3>
    <p>4 月 1 日的半导体叙事不是单一新闻驱动，而是三条线同时成立：一是英伟达生态继续扩张，AI 算力需求没有退坡；二是 SEMICON China 2026 把国产设备新品集中推到聚光灯下；三是存储扩产、先进封装升级和长鑫存储 IPO 预期，继续把资本开支逻辑压在设备环节上。就交易优先级看，设备 > 设计映射 > 材料修复。</p>
  </article>
  <article class="rt-panel">
    <div class="rt-legend">catalyst tape</div>
    <div class="rt-timeline">
      <div class="rt-timeline-item">
        <div class="rt-timeline-date">03-25</div>
        <div class="rt-timeline-copy">存储扩产与先进封装升级，被市场重新定价为 2026 年设备需求释放的重要起点。</div>
      </div>
      <div class="rt-timeline-item">
        <div class="rt-timeline-date">03-31</div>
        <div class="rt-timeline-copy">自主化驱动高景气逻辑被强化，设备板块被继续放大为“确定性最强”的硬科技分支。</div>
      </div>
      <div class="rt-timeline-item">
        <div class="rt-timeline-date">04-01</div>
        <div class="rt-timeline-copy">AI 生态扩张与国产化突破形成双利好，行业从单点突破叙事上升到全产业链跃迁叙事。</div>
      </div>
    </div>
  </article>
</section>
<div class="rt-grid">
  <section class="rt-card rt-card--full">
    <p class="rt-k">quote matrix</p>
    <div class="rt-quote-grid">
      <article class="rt-quote">
        <div class="rt-quote-head">
          <div>
            <div class="rt-quote-name">北方华创</div>
            <div class="rt-quote-code">002371.SZ</div>
          </div>
          <div class="rt-up">+0.79%</div>
        </div>
        <div class="rt-quote-price rt-up">450.53</div>
        <div class="rt-quote-meta"><span>PE 52.93</span><span>PB 9.23</span></div>
        <svg class="rt-spark" viewBox="0 0 160 58" preserveAspectRatio="none">
          <polyline fill="none" stroke="#db7c33" stroke-width="3" points="0,30 40,14 80,46 120,12 160,24" />
          <polyline fill="none" stroke="#db7c33" stroke-opacity="0.18" stroke-width="10" stroke-linecap="round" points="0,30 40,14 80,46 120,12 160,24" />
        </svg>
      </article>
      <article class="rt-quote">
        <div class="rt-quote-head">
          <div>
            <div class="rt-quote-name">中微公司</div>
            <div class="rt-quote-code">688012.SH</div>
          </div>
          <div class="rt-up">+2.34%</div>
        </div>
        <div class="rt-quote-price rt-up">313.54</div>
        <div class="rt-quote-meta"><span>PE 89.22</span><span>ROE 7.32%</span></div>
        <svg class="rt-spark" viewBox="0 0 160 58" preserveAspectRatio="none">
          <polyline fill="none" stroke="#c34f30" stroke-width="3" points="0,42 40,44 80,20 120,28 160,14" />
          <polyline fill="none" stroke="#c34f30" stroke-opacity="0.18" stroke-width="10" stroke-linecap="round" points="0,42 40,44 80,20 120,28 160,14" />
        </svg>
      </article>
      <article class="rt-quote">
        <div class="rt-quote-head">
          <div>
            <div class="rt-quote-name">寒武纪</div>
            <div class="rt-quote-code">688256.SH</div>
          </div>
          <div class="rt-up">+6.96%</div>
        </div>
        <div class="rt-quote-price rt-up">1051.40</div>
        <div class="rt-quote-meta"><span>PE 304.57</span><span>PB 50.54</span></div>
        <svg class="rt-spark" viewBox="0 0 160 58" preserveAspectRatio="none">
          <polyline fill="none" stroke="#b93126" stroke-width="3" points="0,46 40,34 80,38 120,20 160,6" />
          <polyline fill="none" stroke="#b93126" stroke-opacity="0.18" stroke-width="10" stroke-linecap="round" points="0,46 40,34 80,38 120,20 160,6" />
        </svg>
      </article>
      <article class="rt-quote">
        <div class="rt-quote-head">
          <div>
            <div class="rt-quote-name">沪硅产业</div>
            <div class="rt-quote-code">688126.SH</div>
          </div>
          <div class="rt-up">+2.07%</div>
        </div>
        <div class="rt-quote-price rt-up">17.25</div>
        <div class="rt-quote-meta"><span>PB 6.34</span><span>材料修复</span></div>
        <svg class="rt-spark" viewBox="0 0 160 58" preserveAspectRatio="none">
          <polyline fill="none" stroke="#d98f42" stroke-width="3" points="0,16 40,22 80,40 120,36 160,28" />
          <polyline fill="none" stroke="#d98f42" stroke-opacity="0.18" stroke-width="10" stroke-linecap="round" points="0,16 40,22 80,40 120,36 160,28" />
        </svg>
      </article>
    </div>
  </section>
  <section class="rt-card rt-card--wide">
    <p class="rt-k">产业链主线</p>
    <ul class="rt-list">
      <li>设备：北方华创、中微公司是主战场，订单预期与龙头业绩最容易形成正反馈。</li>
      <li>设计：寒武纪承担 AI 算力映射弹性，适合做情绪温度计而非低波段锚。</li>
      <li>材料：沪硅产业处于景气修复链条中，弹性不如设备，但能验证景气是否扩散。</li>
      <li>制造映射：中芯国际在资讯中被多次提及，是“设备景气兑现”的需求侧证据。</li>
    </ul>
  </section>
  <section class="rt-card">
    <p class="rt-k">板块热度</p>
    <p class="rt-v">84 / 100</p>
    <div class="rt-band">
      <div class="rt-band-row">
        <div class="rt-band-label">设备景气</div>
        <div class="rt-band-track"><div class="rt-band-fill" style="width:88%"></div></div>
        <div class="rt-band-value rt-up">88</div>
      </div>
      <div class="rt-band-row">
        <div class="rt-band-label">设计弹性</div>
        <div class="rt-band-track"><div class="rt-band-fill" style="width:79%"></div></div>
        <div class="rt-band-value rt-up">79</div>
      </div>
      <div class="rt-band-row">
        <div class="rt-band-label">材料修复</div>
        <div class="rt-band-track"><div class="rt-band-fill" style="width:63%"></div></div>
        <div class="rt-band-value rt-flat">63</div>
      </div>
    </div>
  </section>
  <section class="rt-card">
    <p class="rt-k">今日催化</p>
    <p class="rt-v">3 个</p>
    <ul class="rt-list">
      <li>英伟达生态扩张，继续抬升 AI 算力预期</li>
      <li>SEMICON China 2026 强化国产设备新品突破</li>
      <li>存储扩产与先进封装升级延续设备需求释放</li>
    </ul>
  </section>
  <section class="rt-card rt-card--wide">
    <p class="rt-k">重点标的</p>
    <table class="rt-table">
      <thead>
        <tr>
          <th>股票</th>
          <th>收盘价</th>
          <th>4月1日涨跌幅</th>
          <th>换手率</th>
          <th>PE / PB / ROE</th>
          <th>Agent 观察点</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>北方华创</td>
          <td>450.53</td>
          <td>+0.79%</td>
          <td>0.87%</td>
          <td>52.93 / 9.23 / n.a.</td>
          <td>主线龙头，重点看高位换手是否继续收敛</td>
        </tr>
        <tr>
          <td>中微公司</td>
          <td>313.54</td>
          <td>+2.34%</td>
          <td>1.19%</td>
          <td>89.22 / 7.95 / 7.32%</td>
          <td>设备链中继票，适合看机构承接与趋势延续</td>
        </tr>
        <tr>
          <td>寒武纪</td>
          <td>1051.40</td>
          <td>+6.96%</td>
          <td>2.39%</td>
          <td>304.57 / 50.54 / 23.17%</td>
          <td>AI 映射最强弹性，涨得最快也最容易先分歧</td>
        </tr>
        <tr>
          <td>沪硅产业</td>
          <td>17.25</td>
          <td>+2.07%</td>
          <td>0.71%</td>
          <td>-67.13 / 6.34 / n.a.</td>
          <td>材料链修复观察位，验证行情是否外扩</td>
        </tr>
      </tbody>
    </table>
  </section>
  <section class="rt-card">
    <p class="rt-k">风险</p>
    <ul class="rt-list">
      <li>寒武纪与 AI 映射链估值极高，先手资金获利盘重</li>
      <li>设备分支一致性已经很高，若龙头缩量失败容易快速回吐</li>
      <li>3 月 31 日北方华创与中微公司都出现回撤，说明板块并非无差别上行</li>
    </ul>
  </section>
</div>
`
  )
}

function buildWatchlistWidget(): string {
  return buildWidgetFrame(
    '高弹性成长观察列表',
    '选股结果不只是一个表格，而是一个可以继续解释、继续筛选、继续转成订阅任务的 artifact。',
    `
<div class="rt-grid">
  <section class="rt-card rt-card--full">
    <p class="rt-k">screening thesis</p>
    <ul class="rt-list">
      <li>过去 20 日强于行业中位数</li>
      <li>近 5 日成交额回升，出现再次活跃迹象</li>
      <li>尽量避开纯消息驱动、无成交承接的脉冲票</li>
    </ul>
  </section>
  <section class="rt-card rt-card--wide">
    <p class="rt-k">candidate list</p>
    <table class="rt-table">
      <thead>
        <tr>
          <th>股票</th>
          <th>入选理由</th>
          <th>后续动作</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>沪电股份</td>
          <td>AI 服务器链条中的强趋势中军</td>
          <td>观察 5 日线得失</td>
        </tr>
        <tr>
          <td>胜宏科技</td>
          <td>高弹性且量能扩张明显</td>
          <td>设置突破提醒</td>
        </tr>
        <tr>
          <td>新易盛</td>
          <td>趋势未坏，情绪回暖时弹性强</td>
          <td>等待回踩确认</td>
        </tr>
      </tbody>
    </table>
  </section>
  <section class="rt-card">
    <p class="rt-k">agent actions</p>
    <ul class="rt-list">
      <li>保存为 watchlist</li>
      <li>盘中异动自动解释</li>
      <li>尾盘生成复盘短报</li>
    </ul>
  </section>
</div>
`
  )
}

function buildArtifact(
  workspaceId: string,
  kind: ArtifactKind,
  title: string,
  summary: string,
  prompt: string,
  tags: string[],
  widgetCode?: string,
  seedKey?: string
): RuntimeArtifact {
  const now = new Date().toISOString()
  return {
    id: uuidv4(),
    workspaceId,
    seedKey,
    kind,
    title,
    summary,
    prompt,
    tags,
    widgetCode,
    createdAt: now,
    updatedAt: now
  }
}

function buildWorkspace(
  title: string,
  kind: WorkspaceKind,
  focus: string,
  summary: string,
  pinnedSymbols: string[],
  memoryNotes: string[],
  suggestedPrompts: string[],
  artifacts: Omit<RuntimeArtifact, 'workspaceId' | 'id' | 'createdAt' | 'updatedAt'>[],
  seedKey?: string,
  model: ModelType = 'sonnet'
): WorkspaceDetail {
  const session = sessionStore.create(model)
  const now = new Date().toISOString()
  const workspaceId = uuidv4()

  return {
    id: workspaceId,
    seedKey,
    title,
    kind,
    focus,
    summary,
    sessionId: session.id,
    pinnedSymbols,
    memoryNotes,
    suggestedPrompts,
    artifacts: artifacts.map((artifact) =>
      buildArtifact(
        workspaceId,
        artifact.kind,
        artifact.title,
        artifact.summary,
        artifact.prompt,
        artifact.tags,
        artifact.widgetCode,
        artifact.seedKey
      )
    ),
    createdAt: now,
    updatedAt: now
  }
}

function buildSeedData(): RuntimeData {
  return {
    workspaces: [
      buildWorkspace(
        '开盘驾驶舱',
        'home',
        '盘前准备',
        '围绕开盘前最该看的大盘、自选、资讯和交易节奏，自动生成今日工作台。',
        ['上证指数', '创业板指', '寒武纪', '中际旭创'],
        [
          '偏好先看结构性主线，再决定今天是否参与',
          '更重视异动的可持续性，不喜欢追情绪尾段',
          '首页需要先给结论，再允许下钻细节'
        ],
        [
          '给我一个今天的开盘前 briefing',
          '把自选股里最危险的三个先挑出来',
          '把昨晚资讯压缩成 5 条能指导交易的结论'
        ],
        [
          {
            seedKey: SEED_KEYS.openingArtifact,
            kind: 'dashboard',
            title: '今日开盘台',
            summary: '基于隔夜信息和个人偏好的盘前工作台。',
            prompt: '生成我的盘前首页',
            tags: ['dashboard', 'open'],
            widgetCode: buildMorningDashboardWidget()
          }
        ],
        SEED_KEYS.openingWorkspace
      ),
      buildWorkspace(
        '半导体链路台',
        'industry',
        '半导体',
        '适合持续追踪某个行业，从行业 F10、催化、重点标的到风险点都能动态生成。',
        ['北方华创', '中微公司', '寒武纪'],
        [
          '更喜欢行业逻辑链，而不是泛资讯摘要',
          '希望每个环节能直接跳转到代表性股票',
          '板块页应优先展示产业链与催化，而不是新闻列表'
        ],
        [
          '帮我更新一下半导体行业的最新催化',
          '把设备、材料、设计三个环节重新排一下优先级',
          '这个行业里最适合做趋势跟踪的是谁'
        ],
        [
          {
            seedKey: SEED_KEYS.semiconductorArtifact,
            kind: 'industry_map',
            title: '半导体行业 F10',
            summary: '产业链、催化、风险和重点标的的组合视图。',
            prompt: '生成半导体行业解读页',
            tags: ['industry', 'semiconductor'],
            widgetCode: buildIndustryMapWidget()
          }
        ],
        SEED_KEYS.semiconductorWorkspace
      ),
      buildWorkspace(
        '策略选股台',
        'watchlist',
        '成长筛选',
        '把自然语言需求转成观察列表，并把结果沉淀成可复用的 watchlist artifact。',
        ['沪电股份', '胜宏科技', '新易盛'],
        [
          '选股结果必须有入选理由和后续动作',
          '更关心结构和位置，而不是单纯高增长',
          '列表应能继续转成提醒和复盘任务'
        ],
        [
          '筛一批 20 日强于板块且量能回升的票',
          '把这个列表里最适合低吸的三只挑出来',
          '给我生成一个高弹性 AI 硬件观察池'
        ],
        [
          {
            seedKey: SEED_KEYS.screeningArtifact,
            kind: 'watchlist',
            title: '高弹性成长观察列表',
            summary: '从自然语言条件生成的股票池及后续动作建议。',
            prompt: '帮我做一个成长股观察列表',
            tags: ['watchlist', 'screening'],
            widgetCode: buildWatchlistWidget()
          }
        ],
        SEED_KEYS.screeningWorkspace
      )
    ]
  }
}

let runtimeData: RuntimeData = { workspaces: [] }
let loaded = false

function load(): void {
  if (loaded) return
  loaded = true

  const filePath = getRuntimePath()
  if (!existsSync(filePath)) {
    runtimeData = buildSeedData()
    save()
    return
  }

  try {
    runtimeData = JSON.parse(readFileSync(filePath, 'utf-8')) as RuntimeData
  } catch (error) {
    console.warn('[runtime] Failed to load runtime store, reseeding', error)
    runtimeData = buildSeedData()
    save()
  }

  if (runtimeData.workspaces.length === 0) {
    runtimeData = buildSeedData()
    save()
  }
}

function save(): void {
  writeFileSync(getRuntimePath(), JSON.stringify(runtimeData, null, 2))
}

function hydrateSeedKeys(): void {
  let changed = false

  for (const mapping of SEED_MAPPINGS) {
    const workspace = runtimeData.workspaces.find((item) => {
      if (item.seedKey === mapping.workspaceKey) return true
      if (item.title === mapping.workspaceTitle) return true
      return item.artifacts.some((artifact) => {
        if (artifact.seedKey === mapping.artifactKey) return true
        return artifact.title === mapping.artifactTitle && artifact.kind === mapping.artifactKind
      })
    })

    if (!workspace) continue

    if (workspace.seedKey !== mapping.workspaceKey) {
      workspace.seedKey = mapping.workspaceKey
      changed = true
    }

    const artifact = workspace.artifacts.find((item) => {
      if (item.seedKey === mapping.artifactKey) return true
      return item.title === mapping.artifactTitle && item.kind === mapping.artifactKind
    })

    if (artifact && artifact.seedKey !== mapping.artifactKey) {
      artifact.seedKey = mapping.artifactKey
      changed = true
    }
  }

  if (changed) {
    save()
  }
}

function syncSeedWorkspaceArtifacts(): void {
  let changed = false

  const syncArtifact = (
    workspaceSeedKey: string,
    artifactSeedKey: string,
    summary: string,
    prompt: string,
    tags: string[],
    widgetCode: string
  ) => {
    const workspace = runtimeData.workspaces.find((item) => item.seedKey === workspaceSeedKey)
    if (!workspace) return

    const artifact = workspace.artifacts.find((item) => item.seedKey === artifactSeedKey)
    if (!artifact) return

    if (
      artifact.summary === summary &&
      artifact.prompt === prompt &&
      JSON.stringify(artifact.tags) === JSON.stringify(tags) &&
      artifact.widgetCode === widgetCode
    ) {
      return
    }

    artifact.summary = summary
    artifact.prompt = prompt
    artifact.tags = tags
    artifact.widgetCode = widgetCode
    artifact.updatedAt = DATA_SNAPSHOT_ISO
    workspace.updatedAt = DATA_SNAPSHOT_ISO
    changed = true
  }

  syncArtifact(
    SEED_KEYS.openingWorkspace,
    SEED_KEYS.openingArtifact,
    '基于 2026-04-01 iFind MCP 真实资讯与股票快照生成的开盘工作台。',
    '生成我的盘前首页',
    ['dashboard', 'open', 'ifind-live'],
    buildMorningDashboardWidget()
  )

  syncArtifact(
    SEED_KEYS.semiconductorWorkspace,
    SEED_KEYS.semiconductorArtifact,
    '基于 2026-04-01 iFind MCP 真实催化、代表股表现与估值生成的行业工作台。',
    '生成半导体行业解读页',
    ['industry', 'semiconductor', 'ifind-live'],
    buildIndustryMapWidget()
  )

  if (changed) {
    save()
  }
}

export const runtimeStore = {
  init(): void {
    load()
    hydrateSeedKeys()
    syncSeedWorkspaceArtifacts()
  },

  list(): WorkspaceMeta[] {
    load()
    return runtimeData.workspaces
      .map(({ artifacts: _artifacts, memoryNotes: _memoryNotes, suggestedPrompts: _suggestedPrompts, ...meta }) => meta)
  },

  get(workspaceId: string): WorkspaceDetail | undefined {
    load()
    return runtimeData.workspaces.find((workspace) => workspace.id === workspaceId)
  },

  create(input?: { title?: string; focus?: string; kind?: WorkspaceKind }): WorkspaceDetail {
    load()
    const title = input?.title?.trim() || '新建工作台'
    const focus = input?.focus?.trim() || '自定义分析'
    const kind = input?.kind || 'home'

    const workspace = buildWorkspace(
      title,
      kind,
      focus,
      '这是一个空白工作台，后续可以承接 Agent 生成的首页、行业页、个股讲解页和选股结果。',
      [],
      [
        '先把这个工作台作为容器，而不是聊天会话',
        '所有后续分析结果都应该沉淀为可复用 artifact'
      ],
      [
        '帮我生成这个工作台的首页',
        '围绕这个主题继续补一个观察列表',
        '把最近一次分析保存成一个新页面'
      ],
      [
        {
          kind: 'briefing',
          title: '工作台说明',
          summary: '解释这个工作台接下来能承接哪些 Agent 结果。',
          prompt: '生成工作台首页',
          tags: ['starter'],
          widgetCode: buildWidgetFrame(
            title,
            '这是新建的 runtime workspace。接下来你可以让 Agent 生成首页、行业页、个股页或观察列表，并把结果保存到这里。',
            `
<div class="rt-grid">
  <section class="rt-card">
    <p class="rt-k">step 1</p>
    <p class="rt-v">定义焦点</p>
    <ul class="rt-list">
      <li>一个行业</li>
      <li>一个策略</li>
      <li>一个持仓组合</li>
    </ul>
  </section>
  <section class="rt-card">
    <p class="rt-k">step 2</p>
    <p class="rt-v">生成页面</p>
    <ul class="rt-list">
      <li>首页 briefing</li>
      <li>个股技术讲解</li>
      <li>选股结果页</li>
    </ul>
  </section>
  <section class="rt-card">
    <p class="rt-k">step 3</p>
    <p class="rt-v">沉淀成果</p>
    <ul class="rt-list">
      <li>保存 artifact</li>
      <li>加入 watchlist</li>
      <li>转成订阅任务</li>
    </ul>
  </section>
</div>
`
          )
        }
      ]
    )

    runtimeData.workspaces.unshift(workspace)
    save()
    return workspace
  },

  delete(workspaceId: string): void {
    load()
    const workspace = runtimeData.workspaces.find((item) => item.id === workspaceId)
    if (!workspace) return

    runtimeData.workspaces = runtimeData.workspaces.filter((item) => item.id !== workspaceId)
    sessionStore.delete(workspace.sessionId)
    save()
  },

  update(workspaceId: string, input: { title?: string; focus?: string }): WorkspaceDetail | undefined {
    load()
    const workspace = runtimeData.workspaces.find((item) => item.id === workspaceId)
    if (!workspace) return undefined

    const nextTitle = input.title?.trim()
    const nextFocus = input.focus?.trim()

    if (nextTitle) {
      workspace.title = nextTitle
    }

    if (nextFocus) {
      workspace.focus = nextFocus
    }

    workspace.updatedAt = new Date().toISOString()
    save()
    return workspace
  },

  reorderWorkspaces(sourceWorkspaceId: string, targetWorkspaceId: string): void {
    load()
    runtimeData.workspaces = moveItem(runtimeData.workspaces, sourceWorkspaceId, targetWorkspaceId)
    save()
  },

  reorderArtifacts(workspaceId: string, sourceArtifactId: string, targetArtifactId: string): void {
    load()
    const workspace = runtimeData.workspaces.find((item) => item.id === workspaceId)
    if (!workspace) return

    workspace.artifacts = moveItem(workspace.artifacts, sourceArtifactId, targetArtifactId)
    workspace.updatedAt = new Date().toISOString()
    save()
  },

  saveArtifact(
    workspaceId: string,
    input: {
      title: string
      kind: ArtifactKind
      summary: string
      prompt: string
      tags?: string[]
      widgetCode?: string
    }
  ): RuntimeArtifact | undefined {
    load()
    const workspace = runtimeData.workspaces.find((item) => item.id === workspaceId)
    if (!workspace) return undefined

    const artifact = buildArtifact(
      workspaceId,
      input.kind,
      input.title,
      input.summary,
      input.prompt,
      input.tags || [],
      input.widgetCode
    )

    workspace.artifacts.unshift(artifact)
    workspace.updatedAt = artifact.updatedAt
    save()
    return artifact
  }
}
