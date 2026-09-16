#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { replacePathsTransaction } from "./sync-source.mjs";

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "reading-space-mn-sync-test-"));
  const publicRoot = path.join(root, "public");
  const stagingRoot = path.join(root, "staging");
  const backupRoot = path.join(root, "backup");
  for (const directory of [publicRoot, stagingRoot, backupRoot]) fs.mkdirSync(directory);
  for (const relative of ["src/value.txt", "web/value.txt", "package.json"]) {
    fs.mkdirSync(path.dirname(path.join(publicRoot, relative)), { recursive: true });
    fs.mkdirSync(path.dirname(path.join(stagingRoot, relative)), { recursive: true });
    fs.writeFileSync(path.join(publicRoot, relative), `old:${relative}`);
    fs.writeFileSync(path.join(stagingRoot, relative), `new:${relative}`);
  }
  return { root, publicRoot, stagingRoot, backupRoot };
}

test("managed snapshot replacement installs the complete candidate", () => {
  const fixture = createFixture();
  try {
    replacePathsTransaction({
      root: fixture.publicRoot,
      stagingRoot: fixture.stagingRoot,
      backupRoot: fixture.backupRoot,
      paths: ["src", "web", "package.json"],
      validate: () => assert.equal(fs.readFileSync(path.join(fixture.publicRoot, "web/value.txt"), "utf8"), "new:web/value.txt"),
    });
    assert.equal(fs.readFileSync(path.join(fixture.publicRoot, "src/value.txt"), "utf8"), "new:src/value.txt");
    assert.equal(fs.readFileSync(path.join(fixture.publicRoot, "package.json"), "utf8"), "new:package.json");
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("managed snapshot replacement rolls back every path after a mid-install failure", () => {
  const fixture = createFixture();
  try {
    assert.throws(
      () => replacePathsTransaction({
        root: fixture.publicRoot,
        stagingRoot: fixture.stagingRoot,
        backupRoot: fixture.backupRoot,
        paths: ["src", "web", "package.json"],
        validate: () => {},
        failAfterInstall: 2,
      }),
      /Injected synchronization failure/,
    );
    for (const relative of ["src/value.txt", "web/value.txt", "package.json"]) {
      assert.equal(fs.readFileSync(path.join(fixture.publicRoot, relative), "utf8"), `old:${relative}`);
    }
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});
