const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const buttonSource = fs.readFileSync(path.join(rootDir, "src", "RSMainButton.js"), "utf8");
const addonSource = fs.readFileSync(path.join(rootDir, "src", "ReadingSpaceMNAddon.js"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `missing function ${name}`);
  const next = source.indexOf("\n  function ", start + 1);
  return source.slice(start, next < 0 ? source.length : next);
}

const mainMenu = functionBody(buttonSource, "showMenu");
for (const item of ["主窗口", "播放器", "发送到 Obsidian"]) {
  assert(mainMenu.includes(`\"${item}\"`), `main menu must keep ${item}`);
}
for (const nestedItem of ["发送当前 PDF", "复制导出 JSON"]) {
  assert(!mainMenu.includes(`\"${nestedItem}\"`), `main menu must move ${nestedItem} into the Obsidian submenu`);
}
assert(mainMenu.includes('"onRSMainButtonMenuObsidian:"'), "main menu must open the Obsidian submenu");

const obsidianMenu = functionBody(buttonSource, "showObsidianMenu");
for (const item of ["发送当前摘录", "发送当前 PDF", "复制导出 JSON"]) {
  assert(obsidianMenu.includes(`\"${item}\"`), `Obsidian submenu must keep ${item}`);
}
for (const item of ["导出当前摘录", "导出当前 PDF"]) {
  assert(obsidianMenu.includes(`\"${item}\"`), `iPad Obsidian submenu must provide ${item}`);
}
assert(
  obsidianMenu.includes("ReadingSpaceMN.mnExport.isIPadRuntime"),
  "Obsidian submenu must select file-export labels from the MN runtime platform",
);
for (const selector of [
  "onRSMainButtonMenuSend:",
  "onRSMainButtonMenuSendDocument:",
  "onRSMainButtonMenuExport:",
]) {
  assert(obsidianMenu.includes(`\"${selector}\"`), `Obsidian submenu must bind ${selector}`);
}
assert(buttonSource.includes("showObsidianMenu: showObsidianMenu"), "main button API must expose showObsidianMenu");
assert(
  addonSource.includes("onRSMainButtonMenuObsidian: function ()")
    && addonSource.includes("ReadingSpaceMN.mainButton.showObsidianMenu(self)"),
  "addon entry must route the parent menu action to showObsidianMenu",
);

console.log("main button Obsidian submenu contract: OK");
