const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");
const failures = [];

function fail(name, message) {
  failures.push({ name, message });
}

function read(file) {
  return fs.readFileSync(path.join(rootDir, file), "utf8");
}

function nativeData(text, files) {
  return {
    text: String(text || ""),
    length() {
      return Buffer.byteLength(this.text);
    },
    writeToFileAtomically(filePath) {
      files[filePath] = this.text;
      return true;
    },
  };
}

function makeHistory(titles, timestamp) {
  const conversations = titles.map((title, index) => ({
    id: `c_${index + 1}`,
    title,
    messages: [
      {
        id: `m_${index + 1}`,
        role: "user",
        content: title,
        timestamp,
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
  return {
    conversations,
    activeConversationId: conversations[0]?.id || "",
    messages: conversations[0]?.messages || [],
    lastUpdated: timestamp,
  };
}

function makeRuntime() {
  const prefs = {};
  const cloud = {};
  const files = {};
  const defaults = {
    stringForKey(key) {
      return Object.prototype.hasOwnProperty.call(prefs, key) ? String(prefs[key]) : null;
    },
    objectForKey(key) {
      return Object.prototype.hasOwnProperty.call(prefs, key) ? prefs[key] : null;
    },
    setObjectForKey(value, key) {
      prefs[key] = value;
    },
    removeObjectForKey(key) {
      delete prefs[key];
    },
    boolForKey(key) {
      const value = prefs[key];
      return value === true || value === 1 || String(value).toLowerCase() === "true" || String(value) === "1";
    },
    setBoolForKey(value, key) {
      prefs[key] = value === true;
    },
    setIntegerForKey(value, key) {
      prefs[key] = Math.round(Number(value || 0));
    },
    synchronize() {
      return true;
    },
  };
  const context = {
    console,
    ReadingSpaceMN: {
      probe: { record() {} },
    },
    NSUserDefaults: {
      standardUserDefaults() {
        return defaults;
      },
    },
    NSUbiquitousKeyValueStore: {
      defaultStore() {
        return {
          objectForKey(key) {
            return Object.prototype.hasOwnProperty.call(cloud, key) ? cloud[key] : null;
          },
          setObjectForKey(value, key) {
            cloud[key] = String(value);
          },
          synchronize() {
            return true;
          },
        };
      },
    },
    Application: {
      sharedInstance() {
        return { documentPath: "/tmp/reading-space-mn-chat-test" };
      },
    },
    NSFileManager: {
      defaultManager() {
        return {
          createDirectoryAtPathWithIntermediateDirectoriesAttributesError() {
            return true;
          },
        };
      },
    },
    NSData: {
      dataWithContentsOfFile(filePath) {
        return Object.prototype.hasOwnProperty.call(files, filePath) ? nativeData(files[filePath], files) : null;
      },
      dataWithStringEncoding(text) {
        return nativeData(text, files);
      },
    },
    NSJSONSerialization: {
      JSONObjectWithDataOptions(data) {
        return JSON.parse(String(data && data.text || ""));
      },
      dataWithJSONObjectOptionsError(value) {
        return nativeData(JSON.stringify(value), files);
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(read("src/RSCore.js"), context, { filename: "src/RSCore.js" });
  context.ReadingSpaceMN.preferences = {
    readEnabled() {
      return defaults.boolForKey(context.ReadingSpaceMN.keys.enabled);
    },
    writeEnabled(value) {
      const previous = defaults.boolForKey(context.ReadingSpaceMN.keys.enabled);
      defaults.setBoolForKey(value === true, context.ReadingSpaceMN.keys.enabled);
      return previous !== (value === true);
    },
  };
  context.ReadingSpaceMN.theme = {
    normalize(value) {
      const text = String(value || "light");
      return text === "dark" || text === "system" ? text : "light";
    },
    read() {
      return String(prefs.readingspace_mn_theme || "light");
    },
    write(value) {
      prefs.readingspace_mn_theme = this.normalize(value);
      return prefs.readingspace_mn_theme;
    },
    options() {
      return ["light", "dark", "system"];
    },
    writeICloud(value) {
      cloud.RSTheme = this.normalize(value);
      return true;
    },
    readICloud() {
      return cloud.RSTheme || "";
    },
  };
  context.ReadingSpaceMN.settings = {
    readAISettings() {
      return {
        aiCoreTestModule: {},
        intelligentSpaceQuickPrompts: [],
        chatSendShortcut: "enter",
        chatKeepEditFocusAfterInsert: false,
        sync: { enabled: false },
      };
    },
    getPayload() {
      return { aiSettings: this.readAISettings() };
    },
    autoSyncAfterSave() {
      return null;
    },
  };
  vm.runInContext(read("src/RSChat.js"), context, { filename: "src/RSChat.js" });
  return { context, prefs, cloud, files };
}

function makeSettingsRuntime() {
  const runtime = makeRuntime();
  vm.runInContext(read("src/RSSettings.js"), runtime.context, { filename: "src/RSSettings.js" });
  return runtime;
}

function allBuckets(selected = []) {
  const buckets = {
    appearance: false,
    aiCore: false,
    aiPrompts: false,
    quickExplainPrefs: false,
    chatPrefs: false,
    audioPrefs: false,
    browserBookmarks: false,
    browserSession: false,
    browserHistory: false,
    secrets: false,
    chatHistory: false,
  };
  selected.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(buckets, key)) buckets[key] = true;
  });
  return buckets;
}

function syncConfig(selected) {
  return {
    schemaVersion: 2,
    enabled: false,
    buckets: allBuckets(selected),
    updatedAt: 1,
  };
}

function configureSync(context, selected) {
  const ai = context.ReadingSpaceMN.settings.readAISettings();
  ai.sync = syncConfig(selected);
  context.ReadingSpaceMN.settings.savePayload({ aiSettings: ai });
}

function cloudJSON(cloud, key) {
  return JSON.parse(String(cloud[key] || "null"));
}

function assertNewerEmptyLocalHistoryWins() {
  const { context, prefs } = makeRuntime();
  const stale = makeHistory(["你好", "你好"], 1000);
  const empty = makeHistory([], 5000);

  prefs.RSIntelligentSpaceHistory = JSON.stringify(stale);
  prefs.readingspace_mn_chat_history = JSON.stringify(empty);

  const state = context.ReadingSpaceMN.chat.getState();
  const count = state.history.conversations.length;
  if (count !== 0) {
    fail(
      "newer-empty-local-history-wins",
      `Expected empty local history to suppress stale legacy mirrors; got ${count} conversations.`,
    );
  }
}

function assertClearHistoryPersistsEmptySnapshot() {
  const { context } = makeRuntime();
  context.ReadingSpaceMN.chat.importHistory(makeHistory(["你好"], 1000));
  context.ReadingSpaceMN.chat.clearHistory();
  const state = context.ReadingSpaceMN.chat.getState();
  const count = state.history.conversations.length;
  if (count !== 0 || state.history.activeConversationId) {
    fail(
      "clear-history-empty",
      `Expected clearHistory to persist zero conversations and no active id; got count=${count}, active=${state.history.activeConversationId}.`,
    );
  }
}

function assertDeleteConversationsCanReachEmpty() {
  const { context } = makeRuntime();
  let state = context.ReadingSpaceMN.chat.importHistory(makeHistory(["你好", "你好"], 1000));
  const firstId = state.history.conversations[0].id;
  const secondId = state.history.conversations[1].id;

  state = context.ReadingSpaceMN.chat.deleteConversation({ conversationId: firstId });
  if (state.history.conversations.length !== 1 || state.history.activeConversationId !== secondId) {
    fail(
      "delete-first-conversation-selects-remaining",
      `Expected one remaining conversation selected; got count=${state.history.conversations.length}, active=${state.history.activeConversationId}.`,
    );
  }

  state = context.ReadingSpaceMN.chat.deleteConversation({ conversationId: secondId });
  if (state.history.conversations.length !== 0 || state.history.activeConversationId) {
    fail(
      "delete-last-conversation-empty",
      `Expected deleting the last conversation to leave an empty state; got count=${state.history.conversations.length}, active=${state.history.activeConversationId}.`,
    );
  }
}

function assertManualSyncDoesNotMergeCloudHistory() {
  const settingsSource = read("src/RSSettings.js");
  const syncSaveStart = settingsSource.indexOf("function syncSaveNow");
  const autoSyncStart = settingsSource.indexOf("function autoSyncAfterSave", syncSaveStart);
  const syncSaveBody = syncSaveStart >= 0 && autoSyncStart > syncSaveStart
    ? settingsSource.slice(syncSaveStart, autoSyncStart)
    : "";
  const activeSyncSaveBody = syncSaveBody.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  if (/mergeImportHistory/.test(activeSyncSaveBody)) {
    fail("manual-upload-no-cloud-merge", "Manual chat history upload must overwrite cloud and must not merge cloud history first.");
  }
  if (!/historyDetail\s*=\s*["']overwritten["']/.test(syncSaveBody)) {
    fail("manual-upload-overwrite-detail", "Manual chat history upload should report overwritten detail.");
  }
}

function assertManualChatUploadOverwritesCloudHistory() {
  const { context, cloud } = makeSettingsRuntime();
  configureSync(context, ["chatHistory"]);
  context.ReadingSpaceMN.chat.importHistory(makeHistory([], 5000), { updatedAt: 5000 });
  cloud.RSIntelligentSpaceHistory = JSON.stringify(makeHistory(["云端旧对话"], 9999999));

  const result = context.ReadingSpaceMN.settings.syncSaveNow({});
  const uploaded = cloudJSON(cloud, "RSIntelligentSpaceHistory");
  const newer = result?.diagnostics?.newerBuckets || [];
  if (result?.error || result?.results?.chatHistory?.ok !== true || result?.results?.chatHistory?.detail !== "overwritten") {
    fail("manual-chat-upload-result", `Expected overwritten chat upload result; got ${JSON.stringify(result?.results?.chatHistory || result)}`);
  }
  if ((uploaded.conversations || []).length !== 0) {
    fail("manual-chat-upload-overwrites-cloud", `Expected local empty history to overwrite cloud; got ${uploaded.conversations.length} conversations.`);
  }
  if (newer.includes("chatHistory")) {
    fail("manual-chat-upload-no-newer-hint", "Expected upload timestamp alignment to suppress immediate cloud-newer chatHistory hint.");
  }
}

function assertManualChatPullOverwritesLocalHistory() {
  const { context, cloud } = makeSettingsRuntime();
  configureSync(context, ["chatHistory"]);
  context.ReadingSpaceMN.chat.importHistory(makeHistory(["本机旧对话"], 1000), { updatedAt: 1000 });
  cloud.RSIntelligentSpaceHistory = JSON.stringify(makeHistory([], 9000));

  const result = context.ReadingSpaceMN.settings.syncPullFromCloud({ confirmed: true });
  const state = context.ReadingSpaceMN.chat.getState();
  if (result?.error || result?.results?.chatHistory?.ok !== true || result?.results?.chatHistory?.detail !== "overwritten") {
    fail("manual-chat-pull-result", `Expected overwritten chat pull result; got ${JSON.stringify(result?.results?.chatHistory || result)}`);
  }
  if ((state.history.conversations || []).length !== 0) {
    fail("manual-chat-pull-overwrites-local", `Expected cloud empty history to overwrite local; got ${state.history.conversations.length} conversations.`);
  }
}

function assertPartialAIPullDoesNotDefaultMissingFields() {
  const { context, cloud } = makeSettingsRuntime();
  const settings = context.ReadingSpaceMN.settings;
  const ai = settings.readAISettings();
  ai.sync = syncConfig(["aiPrompts"]);
  ai.intelligentSpaceQuickPrompts = [{ label: "本机", content: "local", wordLimit: 0 }];
  ai.quickExplain.prompt = "LOCAL_PROMPT";
  ai.quickExplain.promptTemplates = [{ id: "default", label: "本机", content: "LOCAL_PROMPT", wordLimit: 0 }];
  ai.quickExplain.defaultPromptTemplateId = "default";
  settings.savePayload({ aiSettings: ai });
  cloud.RSAISettings = JSON.stringify({
    intelligentSpaceQuickPrompts: [],
    bucketUpdatedAt: { aiPrompts: 9000 },
    updatedAt: 9000,
  });

  const result = settings.syncPullFromCloud({ confirmed: true });
  const next = settings.readAISettings();
  if (result?.error || result?.results?.aiPrompts?.ok !== true) {
    fail("partial-ai-pull-result", `Expected aiPrompts pull success; got ${JSON.stringify(result?.results?.aiPrompts || result)}`);
  }
  if ((next.intelligentSpaceQuickPrompts || []).length !== 0) {
    fail("partial-ai-pull-empty-list", "Expected explicit empty cloud AI prompt list to replace local prompts.");
  }
  if (next.quickExplain?.prompt !== "LOCAL_PROMPT") {
    fail("partial-ai-pull-keep-missing-quick-prompt", `Expected missing cloud quickExplain fields to preserve local prompt; got ${next.quickExplain?.prompt}`);
  }
}

function assertPartialBrowserPullDoesNotDefaultMissingFields() {
  const { context, cloud } = makeSettingsRuntime();
  const settings = context.ReadingSpaceMN.settings;
  const ai = settings.readAISettings();
  ai.sync = syncConfig(["browserBookmarks"]);
  settings.savePayload({
    aiSettings: ai,
    browserSettings: {
      homePage: "https://local.example/",
      bookmarks: [{ url: "https://local-bookmark.example/", title: "Local", time: 1000 }],
      updatedAt: 1000,
    },
  });
  cloud.RSBrowserSettings = JSON.stringify({
    bookmarks: [{ url: "https://cloud-bookmark.example/", title: "Cloud", time: 9000 }],
    bucketUpdatedAt: { browserBookmarks: 9000 },
    updatedAt: 9000,
  });

  const result = settings.syncPullFromCloud({ confirmed: true });
  const browser = settings.readBrowserSettings();
  if (result?.error || result?.results?.browserBookmarks?.ok !== true) {
    fail("partial-browser-pull-result", `Expected browserBookmarks pull success; got ${JSON.stringify(result?.results?.browserBookmarks || result)}`);
  }
  if (browser.homePage !== "https://local.example/") {
    fail("partial-browser-pull-keep-home", `Expected missing cloud homePage to preserve local homePage; got ${browser.homePage}`);
  }
  if (browser.bookmarks?.[0]?.url !== "https://cloud-bookmark.example/") {
    fail("partial-browser-pull-bookmarks", `Expected cloud bookmark import; got ${JSON.stringify(browser.bookmarks || [])}`);
  }
}

assertNewerEmptyLocalHistoryWins();
assertClearHistoryPersistsEmptySnapshot();
assertDeleteConversationsCanReachEmpty();
assertManualSyncDoesNotMergeCloudHistory();
assertManualChatUploadOverwritesCloudHistory();
assertManualChatPullOverwritesLocalHistory();
assertPartialAIPullDoesNotDefaultMissingFields();
assertPartialBrowserPullDoesNotDefaultMissingFields();

if (failures.length) {
  for (const failure of failures) {
    console.error(`[FAIL] ${failure.name}: ${failure.message}`);
  }
  process.exit(1);
}

console.log("verify-chat-history-delete: ok");
