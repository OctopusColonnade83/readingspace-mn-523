#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const publicRoot = path.resolve(import.meta.dirname, "../..");
const manifestPath = path.join(publicRoot, "PUBLIC_SOURCE.json");
export const exactDirectories = ["src", "web"];
export const generatedExclusions = ["src/web-dist"];
export const exactFiles = [
  "pnpm-lock.yaml",
  "scripts/diagnose-selection-toolbar-probe.js",
  "scripts/verify-chat-history-delete.js",
  "scripts/verify-ipad-mn-file-export.js",
  "scripts/verify-ipad-performance-guard.js",
  "scripts/verify-main-button-obsidian-submenu.js",
  "scripts/verify-mn-export-contract.js",
  "scripts/verify-obsidian-export-settings.js",
  "scripts/verify-quick-explain-dictionary.js",
  "scripts/verify-read-aloud-markdown-sanitize.js",
  "scripts/verify-release-notice.js",
  "scripts/verify-selection-toolbar-context.js",
  "scripts/web-build.js",
  "scripts/web-dev.js",
];
const sourceArchivePaths = [...exactDirectories, ...exactFiles, "package.json"];
const managedInstallPaths = [...exactDirectories, ...exactFiles, "package.json", "PUBLIC_SOURCE.json"];
const copiedPackageFields = [
  "name",
  "version",
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
  "pnpm",
  "mnRails",
];

function usage() {
  return [
    "Usage:",
    "  node .github/tools/sync-source.mjs --source PATH --ref COMMIT_OR_TAG",
    "  node .github/tools/sync-source.mjs --verify [--source PATH [--ref COMMIT_OR_TAG]]",
  ].join("\n");
}

function parseArgs(argv) {
  const result = { verify: false, source: "", ref: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") continue;
    if (argument === "--verify") result.verify = true;
    else if (argument === "--source") result.source = argv[++index] || "";
    else if (argument === "--ref") result.ref = argv[++index] || "";
    else if (argument === "--help" || argument === "-h") {
      console.log(usage());
      process.exit(0);
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  if (result.verify) {
    if (result.ref && !result.source) throw new Error("--ref requires --source in verification mode");
  } else if (!result.source || !result.ref) {
    throw new Error("--source and --ref are required for synchronization");
  }
  return result;
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: options.encoding ?? "utf8",
    cwd: options.cwd,
    input: options.input,
    maxBuffer: 64 * 1024 * 1024,
    stdio: options.stdio,
  });
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function listFiles(root, relative, output = []) {
  const normalized = relative.replaceAll(path.sep, "/");
  if (generatedExclusions.includes(normalized)) return output;
  const absolute = path.join(root, relative);
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) throw new Error(`Managed source contains a symbolic link: ${relative}`);
  if (stat.isFile()) {
    output.push(relative.replaceAll(path.sep, "/"));
    return output;
  }
  if (!stat.isDirectory()) throw new Error(`Unsupported managed entry: ${relative}`);
  for (const entry of fs.readdirSync(absolute).sort()) {
    listFiles(root, path.join(relative, entry), output);
  }
  return output;
}

function exactFileList(root) {
  const files = [];
  for (const relative of exactDirectories) listFiles(root, relative, files);
  for (const relative of exactFiles) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute) || !fs.lstatSync(absolute).isFile()) {
      throw new Error(`Required managed file is missing: ${relative}`);
    }
    files.push(relative);
  }
  return files.sort();
}

function fileHashes(root) {
  return Object.fromEntries(exactFileList(root).map((relative) => [relative, sha256(path.join(root, relative))]));
}

function snapshotDigest(files) {
  const lines = Object.entries(files).map(([relative, digest]) => `${digest}  ${relative}\n`).join("");
  return crypto.createHash("sha256").update(lines).digest("hex");
}

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJSONAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, filePath);
}

function assertVersions(root, sourcePackage) {
  const addon = readJSON(path.join(root, "src/mnaddon.json"));
  const core = fs.readFileSync(path.join(root, "src/RSCore.js"), "utf8");
  const runtimeVersion = core.match(/ReadingSpaceMN\.version\s*=\s*["']([^"']+)["']/)?.[1] || "";
  if (!sourcePackage.version || sourcePackage.version !== addon.version || sourcePackage.version !== runtimeVersion) {
    throw new Error(`Source version mismatch: package=${sourcePackage.version || ""}, manifest=${addon.version || ""}, runtime=${runtimeVersion}`);
  }
  if (String(addon.cert_key || "").trim()) throw new Error("Source manifest contains cert_key material");
  return sourcePackage.version;
}

function publicPackageFrom(sourcePackage, currentPublicPackage) {
  const target = structuredClone(currentPublicPackage);
  for (const field of copiedPackageFields) {
    if (Object.hasOwn(sourcePackage, field)) target[field] = sourcePackage[field];
    else delete target[field];
  }
  target.private = true;
  target.license = "UNLICENSED";
  return target;
}

function assertSameKeys(actual, expected, label) {
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (JSON.stringify(actualKeys) === JSON.stringify(expectedKeys)) return actualKeys;
  const missing = expectedKeys.filter((name) => !Object.hasOwn(actual, name));
  const extra = actualKeys.filter((name) => !Object.hasOwn(expected, name));
  throw new Error(`${label}; missing=${missing.join(",") || "none"}; extra=${extra.join(",") || "none"}`);
}

function assertPackageFields(packageJSON, expectedFields, label) {
  for (const field of copiedPackageFields) {
    if (JSON.stringify(packageJSON[field]) !== JSON.stringify(expectedFields[field])) {
      throw new Error(`${label}: ${field}`);
    }
  }
}

function validateManifest(manifest) {
  if (manifest.schemaVersion !== 1 || !manifest.sourceCommit || !manifest.sourceVersion || !manifest.files) {
    throw new Error("PUBLIC_SOURCE.json has an unsupported or incomplete format");
  }
  if (JSON.stringify(manifest.generatedExclusions || []) !== JSON.stringify(generatedExclusions)) {
    throw new Error("PUBLIC_SOURCE.json has an unsupported generated-path exclusion list");
  }
}

function assertSourceExclusionsAbsent(root) {
  for (const relative of generatedExclusions) {
    if (fs.existsSync(path.join(root, relative))) {
      throw new Error(`Generated output must not be tracked by the internal source commit: ${relative}`);
    }
  }
}

function verifySnapshotAt(root, manifest) {
  validateManifest(manifest);
  const actual = fileHashes(root);
  const actualKeys = assertSameKeys(actual, manifest.files, "Managed file list drifted");
  const changed = actualKeys.filter((name) => actual[name] !== manifest.files[name]);
  if (changed.length) throw new Error(`Managed source differs from the recorded snapshot: ${changed.join(", ")}`);
  const packageJSON = readJSON(path.join(root, "package.json"));
  assertPackageFields(packageJSON, manifest.packageFields || {}, "Public package field differs from the source snapshot");
  if (snapshotDigest(actual) !== manifest.snapshotSha256) throw new Error("Snapshot digest does not match PUBLIC_SOURCE.json");
  if (assertVersions(root, packageJSON) !== manifest.sourceVersion) {
    throw new Error("Public product version differs from PUBLIC_SOURCE.json");
  }
  return actualKeys.length;
}

function resolveSource(sourceInput) {
  const requestedSource = fs.realpathSync(path.resolve(sourceInput));
  const sourceRoot = fs.realpathSync(run("git", ["-C", requestedSource, "rev-parse", "--show-toplevel"]).trim());
  if (sourceRoot !== requestedSource) throw new Error(`--source must be the Git root: ${sourceRoot}`);
  return sourceRoot;
}

function exportCommit(sourceRoot, commit, destinationRoot, archivePath) {
  fs.mkdirSync(destinationRoot, { recursive: true });
  run("git", ["-C", sourceRoot, "archive", "--format=tar", `--output=${archivePath}`, commit, "--", ...sourceArchivePaths]);
  run("tar", ["-xf", archivePath, "-C", destinationRoot]);
}

function verifySourceCommit(manifest, sourceInput, ref = "") {
  const sourceRoot = resolveSource(sourceInput);
  const requestedRef = ref || manifest.sourceCommit;
  const commit = run("git", ["-C", sourceRoot, "rev-parse", "--verify", `${requestedRef}^{commit}`]).trim();
  if (commit !== manifest.sourceCommit) {
    throw new Error(`Requested source resolves to ${commit}, but PUBLIC_SOURCE.json records ${manifest.sourceCommit}`);
  }

  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "reading-space-mn-source-verify-"));
  const exportRoot = path.join(temporaryRoot, "export");
  try {
    exportCommit(sourceRoot, commit, exportRoot, path.join(temporaryRoot, "source.tar"));
    assertSourceExclusionsAbsent(exportRoot);
    const sourcePackage = readJSON(path.join(exportRoot, "package.json"));
    if (assertVersions(exportRoot, sourcePackage) !== manifest.sourceVersion) {
      throw new Error("Recorded source version differs from the internal Git object");
    }
    const sourceHashes = fileHashes(exportRoot);
    const sourceKeys = assertSameKeys(sourceHashes, manifest.files, "Internal Git object file list differs from PUBLIC_SOURCE.json");
    const changed = sourceKeys.filter((name) => sourceHashes[name] !== manifest.files[name]);
    if (changed.length) throw new Error(`Public snapshot differs from the internal Git object: ${changed.join(", ")}`);
    if (snapshotDigest(sourceHashes) !== manifest.snapshotSha256) {
      throw new Error("Internal Git object digest differs from PUBLIC_SOURCE.json");
    }
    assertPackageFields(sourcePackage, manifest.packageFields || {}, "Internal package field differs from PUBLIC_SOURCE.json");
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
  console.log(`Internal Git object matched: ${commit}`);
}

function verifySnapshot({ source = "", ref = "", quiet = false } = {}) {
  if (!fs.existsSync(manifestPath)) throw new Error("PUBLIC_SOURCE.json is missing; synchronize from an explicit source commit first");
  const manifest = readJSON(manifestPath);
  const fileCount = verifySnapshotAt(publicRoot, manifest);
  if (source) verifySourceCommit(manifest, source, ref);
  if (!quiet) {
    console.log(`Source snapshot verified: ${manifest.sourceVersion} ${manifest.sourceCommit.slice(0, 12)} (${fileCount} files)`);
  }
}

function copyCandidate(exportRoot, stagingRoot, sourcePackage, manifest) {
  for (const relative of exactDirectories) {
    const destination = path.join(stagingRoot, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(path.join(exportRoot, relative), destination, { recursive: true, errorOnExist: true });
  }
  for (const relative of exactFiles) {
    const destination = path.join(stagingRoot, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(exportRoot, relative), destination);
  }
  const currentPublicPackage = readJSON(path.join(publicRoot, "package.json"));
  writeJSONAtomic(path.join(stagingRoot, "package.json"), publicPackageFrom(sourcePackage, currentPublicPackage));
  writeJSONAtomic(path.join(stagingRoot, "PUBLIC_SOURCE.json"), manifest);
  verifySnapshotAt(stagingRoot, manifest);
}

function removePath(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

export function replacePathsTransaction({ root, stagingRoot, backupRoot, paths, validate, failAfterInstall = 0 }) {
  const backedUp = [];
  const installed = [];
  try {
    for (const relative of paths) {
      const destination = path.join(root, relative);
      if (!fs.existsSync(destination)) continue;
      const backup = path.join(backupRoot, relative);
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      fs.renameSync(destination, backup);
      backedUp.push(relative);
    }
    for (const relative of paths) {
      const staged = path.join(stagingRoot, relative);
      const destination = path.join(root, relative);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.renameSync(staged, destination);
      installed.push(relative);
      if (failAfterInstall === installed.length) {
        throw new Error(`Injected synchronization failure after ${installed.length} installed path(s)`);
      }
    }
    validate();
  } catch (error) {
    const rollbackErrors = [];
    for (const relative of [...installed].reverse()) {
      try {
        removePath(path.join(root, relative));
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    for (const relative of [...backedUp].reverse()) {
      try {
        const backup = path.join(backupRoot, relative);
        const destination = path.join(root, relative);
        if (fs.existsSync(destination)) removePath(destination);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.renameSync(backup, destination);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (rollbackErrors.length) {
      throw new AggregateError([error, ...rollbackErrors], "Synchronization failed and rollback was incomplete");
    }
    throw error;
  }
}

function requestedTestFailurePoint() {
  const requested = process.env.RS_SYNC_TEST_FAIL_AFTER_INSTALL;
  if (!requested) return 0;
  if (process.env.NODE_ENV !== "test") {
    throw new Error("RS_SYNC_TEST_FAIL_AFTER_INSTALL is available only when NODE_ENV=test");
  }
  const value = Number(requested);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("RS_SYNC_TEST_FAIL_AFTER_INSTALL must be a positive integer");
  }
  return value;
}

function replaceManagedSnapshot(stagingRoot, backupRoot, validate) {
  replacePathsTransaction({
    root: publicRoot,
    stagingRoot,
    backupRoot,
    paths: managedInstallPaths,
    validate,
    failAfterInstall: requestedTestFailurePoint(),
  });
}

function synchronize(sourceInput, ref) {
  const sourceRoot = resolveSource(sourceInput);
  const commit = run("git", ["-C", sourceRoot, "rev-parse", "--verify", `${ref}^{commit}`]).trim();
  const temporaryRoot = fs.mkdtempSync(path.join(publicRoot, ".sync-"));
  const exportRoot = path.join(temporaryRoot, "export");
  const stagingRoot = path.join(temporaryRoot, "staging");
  const backupRoot = path.join(temporaryRoot, "backup");

  try {
    exportCommit(sourceRoot, commit, exportRoot, path.join(temporaryRoot, "source.tar"));
    assertSourceExclusionsAbsent(exportRoot);
    fs.mkdirSync(stagingRoot);
    fs.mkdirSync(backupRoot);
    const sourcePackage = readJSON(path.join(exportRoot, "package.json"));
    const version = assertVersions(exportRoot, sourcePackage);
    const exportedHashes = fileHashes(exportRoot);
    const manifest = {
      schemaVersion: 1,
      sourceCommit: commit,
      sourceVersion: version,
      exactDirectories,
      exactFiles,
      generatedExclusions,
      packageFields: Object.fromEntries(copiedPackageFields.map((field) => [field, sourcePackage[field]])),
      snapshotSha256: snapshotDigest(exportedHashes),
      files: exportedHashes,
    };
    copyCandidate(exportRoot, stagingRoot, sourcePackage, manifest);
    replaceManagedSnapshot(stagingRoot, backupRoot, () => verifySnapshot({ source: sourceRoot, ref: commit }));
    console.log(`Public mirror synchronized from ${commit} (version ${version})`);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

export function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    if (options.verify) verifySnapshot(options);
    else synchronize(options.source, options.ref);
  } catch (error) {
    if (error instanceof AggregateError) {
      console.error(error.message);
      for (const nested of error.errors) console.error(nested instanceof Error ? nested.message : String(nested));
    } else {
      console.error(error instanceof Error ? error.message : String(error));
    }
    console.error(usage());
    process.exitCode = 1;
  }
}

const invokedURL = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedURL) main();
