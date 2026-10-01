# dsh-plugin-html-report

**EN** · Renders a session into one self-contained HTML file you can open, archive or forward: escaped content, per-turn stats, compressed tool lines (`/report latest` · `/report <prefix>` · `/report all`). · pure functions under test (injection escaping, self-containment / external-link check, session selection) · ran `/report` against real `~/.dsh/transcripts` sidecars and inspected the output · untested: single messages above 100 KB in a browser.

DeepSeek Harness (dsh) 插件：**把会话转录渲染成自包含 HTML 报告**。读 [transcript](https://github.com/121212165/dsh-plugin-transcript) 的 JSONL 边车，产出单文件、内联样式、零外链的 HTML——发给任何人都能直接双击打开。

适合回答："这次会话我要交给别人看，但不想让他装 dsh、开 Obsidian、或者读 JSONL。"

同系列：[transcript](https://github.com/121212165/dsh-plugin-transcript)（数据源）· [transcript-search](https://github.com/121212165/dsh-plugin-transcript-search)（检索）· [obsidian-push](https://github.com/121212165/dsh-plugin-obsidian-push)（入库）。区别：本插件面向**分享与浏览**，Markdown 那两个面向**归档与检索**。

## 用法

- **`/report`**：渲染**最近活跃的那一个**会话。
- **`/report <sessionId 前缀>`**：渲染匹配前缀的会话（`session-` 前缀带不带都行）。
- **`/report all`**：渲染全部会话，按最后活跃时间倒序。

输出示例：

```text
已渲染 1 份报告：
C:\Users\<你>\.dsh\html-reports\4bc1bd00-916.html（15 条 / 12,645 字符）
```

文件名取 sessionId 去掉 `session-` 前缀后截 12 字符（这个截断规则是系列里踩过的坑：早期用 `slice(0,8)` 导致同前缀会话互相覆盖）。

## 产物形态

- 单文件 `<!doctype html>`，样式全部内联，正文不引用任何外部 `src=http…` / `href=http…`；离线、内网、邮件附件场景都成立。
- 用户/助手消息成"轮次卡片"，**工具调用压成一行 chip 且正文截断到 300 字符**——转录里工具结果可能非常大，报告要的是可读性而不是全量转储。
- 顶部一行统计：条数 / 用户 / 助手 / 工具 / 字符数 / 完整 sessionId。
- 正文按 `at` 升序回放，与转录时间线一致。
- 所有文本、标题、工具名一律 HTML 转义（含 `#` 与 `"`），会话里出现 `<img onerror=...>` 不会变成可执行标签。

## 配置

| 字段 | 默认 | 说明 |
|---|---|---|
| `enabled` | `true` | |
| `dataDir` | `~/.dsh/transcripts` | transcript 边车目录（**只读**） |
| `outDir` | `~/.dsh/html-reports` | 输出目录，不存在会自动创建 |
| `title` | `Session Report` | 页面标题；留空则回退为 `Session <id 前 8 位>` |

只读取 `transcript-YYYY-MM.jsonl` 命名的文件；损坏行跳过并计数，**永不改写源文件**。没有转录数据时明确报错并提示先装 transcript，不会输出空页面糊人。

## 安装

三步，实测于 `@deepseek-ai/dsh@0.1.7-alpha.1`（需 `pnpm` 在 PATH 上）：

```sh
# ① 装进 profile：dsh plugin 把参数原样转发给 pnpm，git 包会自动跑 prepare 构建 lib/
dsh plugin --profile web add github:121212165/dsh-plugin-html-report
```

② 把本仓库根目录 `cordis.patch.yml` 的内容**并进** `$DSH_HOME/profiles/web/cordis.patch.yml`。
该文件默认是 `[]`，所以要么整份替换，要么把 insert 条目并进同一个数组；**不要直接追加**——
追加会形成两个 YAML 文档，启动即报
`failed to parse overlay ... end of the stream or a document separator is expected`（本机实测踩过）。

③ 重启 dsh。配置层与 client 半都要重启才生效（客户端按 boot 时算出的内容 rev 下发，硬刷新浏览器没用）。

自检挂载：`dsh --profile web --dump-config | grep dsh-plugin-html-report`，应看到该条目。
## 验证状态

- 纯函数（转义防注入、统计计数、自包含性与外链检查、工具行压缩、会话选择：缺省最新 / all 倒序 / 前缀匹配含 `session-` 变体 / 交错记录取最后时间）8 个 `node --test` 全绿。
- 本机 live：对真实 `~/.dsh/transcripts` 边车执行 `/report`，产出 HTML 结构与统计逐项目视通过。
- 未验证：超大单条消息（>100KB 文本）在浏览器里的渲染表现；长文本仅工具行做截断，用户/助手全文照排。

## 借鉴来源与差异

| 借鉴来源 | 借鉴了什么 | 我们的差异 |
|---|---|---|
| [simonw/claude-code-transcripts](https://github.com/simonw/claude-code-transcripts)（1.7k★） | 「把会话转录发布成可分享页面」这个需求方向 | 它面向 Claude Code 单一格式；本插件读的是 dsh-plugin-transcript 的 JSONL 契约（跨工具），渲染为自包含单文件 HTML，独立实现 |
