const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const settingsSource = fs.readFileSync(path.join(rootDir, "src", "RSSettings.js"), "utf8");
const exportSource = fs.readFileSync(path.join(rootDir, "src", "RSMNExport.js"), "utf8");
const homeSource = fs.readFileSync(path.join(rootDir, "web", "src", "pages", "HomePage.jsx"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const needle of [
  'obsidianExport: {',
  'markdownFolder: "ReadingSpace/MarginNote 导入"',
  'next.obsidianExport.markdownFolder',
]) {
  assert(settingsSource.includes(needle), `settings contract missing ${needle}`);
}

for (const needle of [
  'destination: exportDestination(parts)',
  'destination: base.destination',
]) {
  assert(exportSource.includes(needle), `export contract missing ${needle}`);
}

for (const needle of [
  '{ id: "obsidian", label: "Obsidian 推送" }',
  'section === "obsidian"',
  'label="Markdown 导入目录"',
  'ai?.obsidianExport?.markdownFolder',
  'next.aiSettings.obsidianExport.markdownFolder = event.target.value',
]) {
  assert(homeSource.includes(needle), `MN settings UI missing ${needle}`);
}

const guideStart = homeSource.indexOf('aria-label="Obsidian 推送使用指南"');
assert(guideStart >= 0, "MN settings UI missing the Obsidian push guide");
const guideEnd = homeSource.indexOf("</details>", guideStart);
assert(guideEnd > guideStart, "Obsidian push guide must use a details disclosure");
const guideSource = homeSource.slice(guideStart, guideEnd);

for (const needle of [
  '<details className="settings-explain-details">',
  '<summary className="settings-explain-summary">使用指南</summary>',
  'Bridge Host、Port 和 Token 与“音频朗读”的本地 Obsidian 桥接共用',
  'Obsidian vault 内的相对目录',
  '当前不会传输 PDF 文件',
  'ReadingSpace 主按钮',
]) {
  assert(guideSource.includes(needle), `Obsidian push guide missing ${needle}`);
}

assert(!/<details[^>]*\sopen(?:=|[\s>])/.test(guideSource), "Obsidian push guide must be collapsed by default");

console.log("Obsidian export settings contract: OK");
