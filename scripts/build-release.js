const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");

const contractScripts = [
  "verify-public-boundary.js",
  "verify-ipad-performance-guard.js",
  "verify-settings-sync-contract.js",
  "verify-chat-history-delete.js",
  "verify-mn-export-contract.js",
  "verify-ipad-mn-file-export.js",
  "verify-main-button-obsidian-submenu.js",
  "verify-obsidian-export-settings.js",
  "verify-selection-toolbar-context.js",
  "verify-quick-explain-dictionary.js",
  "verify-read-aloud-markdown-sanitize.js",
  "verify-release-notice.js",
  "verify-update-flow.js",
];

function timestampLabel(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join("")
    + "-"
    + [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join("");
}

function readJSON(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function verifyVersions(packageJSON, addonJSON) {
  const coreSource = fs.readFileSync(path.join(rootDir, "src", "RSCore.js"), "utf8");
  const runtimeVersion = coreSource.match(/ReadingSpaceMN\.version\s*=\s*["']([^"']+)["']/)?.[1] || "";
  if (!packageJSON.name || !packageJSON.version) throw new Error("package.json is missing name or version");
  if (!addonJSON.addonid) throw new Error("src/mnaddon.json is missing addonid");
  if (packageJSON.version !== addonJSON.version || packageJSON.version !== runtimeVersion) {
    throw new Error(`Version mismatch: package=${packageJSON.version}, manifest=${addonJSON.version}, runtime=${runtimeVersion}`);
  }
  if (String(addonJSON.cert_key || "").trim()) {
    throw new Error("The public source manifest must not contain cert_key material");
  }
}

function verifyUpdateFlow() {
  for (const script of contractScripts) {
    execFileSync(process.execPath, [path.join(rootDir, "scripts", script)], {
      cwd: rootDir,
      stdio: "inherit",
    });
  }
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function build() {
  const packageJSON = readJSON("package.json");
  const addonJSON = readJSON("src/mnaddon.json");
  verifyVersions(packageJSON, addonJSON);
  verifyUpdateFlow(rootDir);

  const buildStamp = timestampLabel();
  execFileSync(process.execPath, [path.join(rootDir, "scripts", "web-build.js")], {
    cwd: rootDir,
    env: { ...process.env, RS_RELEASE_BUILD_STAMP: buildStamp },
    stdio: "inherit",
  });

  const webEntry = path.join(rootDir, "src", "web-dist", "index.html");
  if (!fs.existsSync(webEntry)) throw new Error("Web build did not produce src/web-dist/index.html");

  const artifactsDir = path.join(rootDir, "artifacts");
  const safeName = packageJSON.name.replace(/^@/, "").replaceAll("/", "-");
  const fixedName = `${safeName}-v${packageJSON.version}.mnaddon`;
  const stampedName = `${safeName}-v${packageJSON.version}-${buildStamp}.mnaddon`;
  const fixedPath = path.join(artifactsDir, fixedName);
  const stampedPath = path.join(artifactsDir, stampedName);
  const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "reading-space-mn-build-"));

  try {
    fs.cpSync(path.join(rootDir, "src"), stagingRoot, { recursive: true });
    fs.mkdirSync(artifactsDir, { recursive: true });
    fs.rmSync(fixedPath, { force: true });
    execFileSync("zip", ["-r", "-q", fixedPath, "."], { cwd: stagingRoot, stdio: "inherit" });
    if (!fs.existsSync(fixedPath) || fs.statSync(fixedPath).size === 0) {
      throw new Error("The .mnaddon archive was not created");
    }
    fs.copyFileSync(fixedPath, stampedPath);
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
  }

  console.log(`Build successful: ${fixedPath}`);
  console.log(`Timestamped copy: ${stampedPath}`);
  console.log(`SHA-256: ${sha256(fixedPath)}`);
}

build();
