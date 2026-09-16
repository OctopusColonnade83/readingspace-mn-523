const fs = require("fs");
const path = require("path");
const vm = require("vm");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const source = fs.readFileSync(path.join(__dirname, "..", "src", "RSMNExport.js"), "utf8");
const runtime = { osType: 0 };
const writes = [];
const saves = [];
const probes = [];
const huds = [];

const sandbox = {
  Application: {
    sharedInstance() {
      return {
        osType: runtime.osType,
        tempPath: "/tmp/readingspace-mn",
        cachePath: "",
        documentPath: "",
        saveFileWithUti(filePath, uti) {
          saves.push({ filePath: String(filePath), uti: String(uti) });
        },
      };
    },
  },
  NSData: {
    dataWithStringEncoding(text, encoding) {
      return {
        writeToFileAtomically(filePath, atomically) {
          writes.push({
            text: String(text),
            encoding,
            filePath: String(filePath),
            atomically: atomically === true,
          });
          return true;
        },
      };
    },
  },
  ReadingSpaceMN: {
    version: "0.1.0",
    settings: {
      readAISettings() {
        return {
          obsidianExport: { markdownFolder: "ReadingSpace/MarginNote 导入" },
          audioReading: { obsidianBridge: {} },
        };
      },
    },
    shortString(value, limit) {
      return String(value == null ? "" : value).slice(0, limit || 160);
    },
    view: {
      showHUD(message) {
        huds.push(String(message));
      },
    },
    probe: {
      record(event, detail) {
        probes.push({ event: String(event), detail: detail || {} });
      },
    },
  },
  console,
};

vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "RSMNExport.js" });

const exporter = sandbox.ReadingSpaceMN.mnExport;
assert(exporter, "MN exporter must be available");
assert(typeof exporter.isIPadRuntime === "function", "iPad runtime detector must be exported");
assert(typeof exporter.sendExportResultToObsidian === "function", "transport dispatcher must be exported");

assert(exporter.isIPadRuntime() === true, "osType 0 must use the iPad transport");
runtime.osType = 2;
assert(exporter.isIPadRuntime() === false, "osType 2 must keep the Mac bridge transport");
runtime.osType = 0;

const json = JSON.stringify({ schema: "reading-space.mn-export.v1", excerpts: [{ mnNoteId: "note-1" }] });
const result = exporter.sendExportResultToObsidian({
  ok: true,
  json,
  summary: {
    mnNoteId: "note-1",
    mnDocMd5: "ABCDEF1234567890",
    documentTitle: "iPad Contract PDF",
    mode: "current",
    exportCount: 1,
  },
});

assert(result && result.ok === true, "iPad export must report a prepared file");
assert(result.transport === "file", "iPad export must use the file transport");
assert(result.pending === true, "save panel completion must remain pending");
assert(writes.length === 1, "iPad export must write one temporary JSON file");
assert(writes[0].text === json, "temporary file must contain the unchanged export JSON");
assert(writes[0].encoding === 4, "temporary JSON must use UTF-8 encoding");
assert(writes[0].atomically === true, "temporary JSON must be written atomically");
assert(saves.length === 1, "iPad export must open one system save panel");
assert(saves[0].filePath === writes[0].filePath, "save panel must receive the prepared file");
assert(saves[0].uti === "public.json", "save panel must use the JSON UTI");
assert(
  /\/reading-space-mn-abcdef12-\d{8}-\d{6}\.json$/i.test(saves[0].filePath),
  "iPad export filename must include the doc id prefix and local timestamp",
);
assert(huds.some(message => message.includes("ReadingSpace/MarginNote 导入")), "HUD must name the target vault folder");
assert(probes.some(entry => entry.event === "MNExport:filePrepared"), "file preparation must be probed");
assert(probes.some(entry => entry.event === "MNExport:savePanelOpened"), "save panel opening must be probed");
assert(!probes.some(entry => entry.event === "MNExport:bridgeRequested"), "iPad export must not call the Mac bridge");

console.log("iPad MN file export contract: OK");
