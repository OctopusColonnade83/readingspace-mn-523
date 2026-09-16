const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const ignoredDirectories = new Set([".git", "artifacts", "node_modules", "web-dist"]);
const forbiddenRootEntries = new Set([
  ".agents",
  ".backups",
  ".codex-links",
  ".qoder",
  ".trae",
  ".uploads",
  "AGENTS.md",
  "AGENTS.override.md",
  "release",
  "readingspace-mn-更新日志.md",
]);
const requiredPaths = [
  ".gitignore",
  "LICENSE",
  "PUBLIC_SOURCE.json",
  "README.md",
  "SECURITY.md",
  "package.json",
  "pnpm-lock.yaml",
  "src/main.js",
  "src/mnaddon.json",
  "web/src/main.jsx",
];
const sensitivePatterns = [
  { label: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { label: "GitHub token", pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{40,})\b/ },
  { label: "cloud access key", pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { label: "credential-bearing URL", pattern: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s:/@]+:[^\s/@]+@/i },
  { label: "personal home path", pattern: /(?:\/Users\/[^/\s"'`]+|\/home\/[^/\s"'`]+|[A-Za-z]:\\Users\\[^\\\s"'`]+)/ },
  { label: "Passport path", pattern: /\/Volumes\/Passport(?:\/|\b)/ },
];

function walk(directory, relative = "", files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const nextRelative = relative ? `${relative}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new Error(`Symbolic links are not allowed: ${nextRelative}`);
    if (stat.isDirectory()) walk(absolute, nextRelative, files);
    else if (stat.isFile()) files.push(nextRelative);
  }
  return files;
}

for (const entry of forbiddenRootEntries) {
  if (fs.existsSync(path.join(rootDir, entry))) throw new Error(`Internal workspace content is present: ${entry}`);
}
for (const required of requiredPaths) {
  if (!fs.existsSync(path.join(rootDir, required))) throw new Error(`Required public file is missing: ${required}`);
}

const files = walk(rootDir);
for (const relative of files) {
  const basename = path.basename(relative);
  if (/^(?:方案|指南|策略|笔记|设计)-本地-/.test(basename)) {
    throw new Error(`Local working document is present: ${relative}`);
  }
  const content = fs.readFileSync(path.join(rootDir, relative));
  if (content.includes(0)) continue;
  const text = content.toString("utf8");
  for (const check of sensitivePatterns) {
    if (check.pattern.test(text)) throw new Error(`${check.label} detected in ${relative}`);
  }
}

console.log(`Public boundary check passed: ${files.length} files inspected`);
