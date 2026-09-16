const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const settings = read("src/RSSettings.js");
const home = read("web/src/pages/HomePage.jsx");
const styles = read("web/src/styles.css");
const quickExplain = read("src/RSQuickExplain.js");
const addon = read("src/ReadingSpaceMNAddon.js");
const packageJSON = JSON.parse(read("package.json"));

function requireText(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`${label}: missing ${needle}`);
}

function requirePattern(source, pattern, label) {
  if (!pattern.test(source)) throw new Error(`${label}: pattern not found: ${pattern}`);
}

requireText(settings, 'id: "ai-dictionary", label: "AI 查词"', "protected AI dictionary prompt");
requireText(settings, "function defaultAIDictionaryPrompt()", "AI dictionary default prompt");
requireText(settings, "function defaultLookupAITranslationPrompt()", "lookup AI translation default prompt");
requireText(settings, "return [defaultTemplate, dictionaryTemplate].concat(custom).slice(0, 20);", "protected prompt recovery");
requireText(settings, "promptTemplates: defaultQuickExplainPromptTemplates(defaultQuickExplainPrompt())", "default settings protected prompts");
requireText(settings, 'providerOrder: ["youdao", "bing", "ai-translation"]', "lookup provider order default");
requireText(settings, "function mergeDictionaryLookup(base, incoming)", "lookup settings normalization");

requireText(home, '"ai-dictionary": { id: "ai-dictionary", label: "AI 查词"', "settings UI AI dictionary prompt");
requireText(home, "QUICK_EXPLAIN_PROTECTED_TEMPLATE_IDS.has(id)", "protected prompt deletion guard");
requireText(home, "function resetQuickTemplate(id)", "protected prompt reset");
requireText(home, "内置提示词不可删除", "protected prompt user hint");
const settingsSections = home.slice(home.indexOf("const sections = ["), home.indexOf("];", home.indexOf("const sections = [")) + 2);
if (settingsSections.includes('{ id: "lookup", label: "查词" }')) {
  throw new Error("lookup settings: 查词 must not remain a top-level settings section");
}
requirePattern(home, /\["prompt",\s*"提示词"\],[\s\S]{0,80}\["lookup",\s*"查词"\]/, "lookup tab after quick explain prompts");
requireText(home, 'section === "quick" && quickExplainSubPanel === "lookup"', "lookup content under quick explain");
requireText(home, 'requestedSection === "lookup" ? "quick" : requestedSection', "legacy lookup route compatibility");
requireText(home, '["sources", "来源与排序"]', "lookup source order panel");
requireText(home, '["translation", "AI 翻译"]', "lookup AI translation panel");
requireText(home, '["pronunciation", "读音"]', "lookup pronunciation panel");
requireText(home, "function moveLookupProvider(providerId, direction)", "lookup source ordering control");
requireText(home, "DEFAULT_LOOKUP_AI_TRANSLATION_PROMPT", "protected lookup translation prompt UI");
requirePattern(home, /<div className="lookup-translation-prompt-section">[\s\S]*?<ResizableTextArea[\s\S]*?lookup-translation-prompt[\s\S]*?<div className="settings-actions left">/, "lookup translation prompt shared inset container");
const lookupStylesIndex = styles.indexOf(".lookup-source-list {");
const compactMediaIndex = styles.lastIndexOf("@media (max-width: 420px)");
if (lookupStylesIndex < 0 || compactMediaIndex < 0 || lookupStylesIndex > compactMediaIndex) {
  throw new Error("lookup settings styles: base source cards must not be limited to the compact media query");
}
requirePattern(styles, /\.lookup-translation-prompt-section\s*\{[^}]*box-sizing:\s*border-box;[^}]*padding:\s*0 16px 14px;/, "lookup translation prompt symmetric inset");
requirePattern(styles, /\.lookup-translation-prompt-section \.settings-actions\.left\s*\{[^}]*margin:\s*0;[^}]*padding:\s*0;/, "lookup translation action shared boundary");
if (/\.lookup-translation-prompt\s*\{[^}]*width:\s*calc\(/.test(styles)) {
  throw new Error("lookup translation prompt: textarea width must not combine calculated width with inner margins");
}

requireText(quickExplain, 'var PANEL_MODE_DICTIONARY = "dictionary";', "dictionary panel mode");
requireText(quickExplain, 'var AI_TRANSLATION_PROVIDER = "ai-translation";', "lookup AI translation provider");
requireText(quickExplain, '"划词", addon, "onRSQuickExplainSelectionModeToggle:"', "quick explain selection mode button");
requireText(quickExplain, 'addon.rsQuickExplainSelectionModeButton.backgroundColor = selectionEnabled ? color("accent") : color("buttonBg")', "selection mode visual state");
requireText(quickExplain, '"QuickExplain:selectionModeChanged"', "selection mode runtime probe");
requireText(quickExplain, '"https://dict.youdao.com/w/" + encoded + "/"', "Youdao provider URL");
requireText(quickExplain, '"https://cn.bing.com/dict/search?cc=cn&q=" + encoded', "Bing provider URL");
requireText(quickExplain, "NSURLConnection.sendAsynchronousRequestQueueCompletionHandler", "native parallel provider requests");
requireText(quickExplain, "new DOMParser().parseFromString", "WebView dictionary parser");
requireText(quickExplain, "#phrsListTab .trans-container li", "Youdao definition selector");
requireText(quickExplain, "#headword h1", "Bing headword selector");
requireText(quickExplain, ".qdef li", "Bing definition selector");
requireText(quickExplain, ".baav .pronounce", "Youdao pronunciation selector");
requireText(quickExplain, "#bigaud_uk", "Bing UK pronunciation source");
requireText(quickExplain, "#bigaud_us", "Bing US pronunciation source");
requireText(quickExplain, "window.__rsDictionaryAITranslationChunk=function", "lookup AI translation receiver");
requireText(quickExplain, '"QuickExplainDictionary:aiTranslationStart"', "lookup AI translation start probe");
requireText(quickExplain, '"QuickExplainDictionary:aiTranslationResult"', "lookup AI translation result probe");
requireText(quickExplain, '"QuickExplainDictionary:aiTranslationRendered"', "lookup AI translation render probe");
requireText(quickExplain, '"QuickExplainDictionary:audioRequested"', "dictionary pronunciation probe");
requireText(quickExplain, "addon.rsQuickExplainRequestId !== requestId", "stale request guard");
requireText(quickExplain, '"QuickExplainDictionary:runtimeReady"', "dictionary runtime ready probe");
requireText(quickExplain, '"QuickExplainDictionary:modeChanged"', "dictionary mode probe");
requireText(quickExplain, '"QuickExplainDictionary:start"', "dictionary start probe");
requireText(quickExplain, '"QuickExplainDictionary:providerResult"', "dictionary provider probe");
requireText(quickExplain, '"QuickExplainDictionary:providerInjected"', "dictionary injection probe");
requireText(quickExplain, '"QuickExplainDictionary:rendered"', "dictionary rendered probe");
requireText(quickExplain, "function dictionaryInjectionScripts(result)", "bounded dictionary injection transport");
requireText(quickExplain, "window.__rsDictionaryReceiveChunk=function", "WebView dictionary chunk receiver");
requireText(quickExplain, "function runWebViewScriptAsync(webView, script, callback)", "async-only WebView evaluator support");
requireText(quickExplain, "addon.rsQuickExplainDictionaryTexts[provider]", "native dictionary result cache");
requireText(quickExplain, "addon.rsQuickExplainDictionaryActiveProvider === provider", "active dictionary provider result routing");
requireText(quickExplain, "(!dictionary || !answer)", "dictionary result actions while other providers load");
const injectionBody = quickExplain.slice(quickExplain.indexOf("function injectDictionaryProvider"), quickExplain.indexOf("function requestDictionaryProvider"));
if (!injectionBody.includes("runWebViewScriptAsync")) throw new Error("dictionary injection: provider payload must use the async-capable WebView evaluator");
requirePattern(quickExplain, /function lookupDictionary[\s\S]*?function togglePanelMode/, "dictionary lookup function");
const lookupBody = quickExplain.slice(quickExplain.indexOf("function lookupDictionary"), quickExplain.indexOf("function togglePanelMode"));
if (lookupBody.includes("ReadingSpaceMN.chat")) throw new Error("dictionary mode must not call AI");
const explainBody = quickExplain.slice(quickExplain.indexOf("function explain(addon"), quickExplain.indexOf("function explainCurrent"));
const maybeAutoBody = quickExplain.slice(quickExplain.indexOf("function maybeAuto"), quickExplain.indexOf("function toggleSelectionMode"));
if (!/panelMode\(addon\)\s*===\s*PANEL_MODE_DICTIONARY[\s\S]{0,100}lookupDictionary/.test(explainBody)
  || !/return\s+explain\(addon,\s*current\.text,\s*"selection-mode"\)/.test(maybeAutoBody)) {
  throw new Error("selection mode: a new selection must follow the active explain or dictionary panel mode");
}
const onlineRequestBody = quickExplain.slice(quickExplain.indexOf("function requestDictionaryProvider"), quickExplain.indexOf("function buildLookupAITranslationPrompt"));
if (onlineRequestBody.includes("ReadingSpaceMN.chat")) throw new Error("Youdao/Bing requests must remain independent from AI");
const translationBody = quickExplain.slice(quickExplain.indexOf("function startDictionaryAITranslation"), quickExplain.indexOf("function handleDictionarySignal"));
if (!translationBody.includes("ReadingSpaceMN.chat.runPrompt")) throw new Error("AI translation provider must use the shared AI request layer");
for (const forbidden of ["layer.zPosition", "overlayZPosition", "audio_player_focus"]) {
  if (quickExplain.includes(forbidden)) throw new Error(`performance guard: forbidden ${forbidden}`);
}

requireText(addon, "onRSQuickExplainModeToggle: function ()", "addon mode selector");
requireText(addon, "ReadingSpaceMN.quickExplain.togglePanelMode(self)", "addon mode routing");
requireText(addon, "onRSQuickExplainSelectionModeToggle: function ()", "addon selection mode selector");
requireText(addon, "ReadingSpaceMN.quickExplain.toggleSelectionMode(self)", "addon selection mode routing");
if (packageJSON.scripts["verify:quick-explain-dictionary"] !== "node scripts/verify-quick-explain-dictionary.js") {
  throw new Error("package.json: missing verify:quick-explain-dictionary script");
}

const instrumentedSettings = settings.replace(
  "readAppearanceSettings: readAppearanceSettings\n  };",
  "readAppearanceSettings: readAppearanceSettings,\n    __normalizeQuickExplainPromptTemplates: normalizeQuickExplainPromptTemplates,\n    __mergeDictionaryLookup: mergeDictionaryLookup\n  };",
);
const settingsSandbox = { ReadingSpaceMN: { preferencePrefix: "test_", keys: {} } };
vm.runInNewContext(instrumentedSettings, settingsSandbox, { filename: "RSSettings.js" });
const recoveredPrompts = settingsSandbox.ReadingSpaceMN.settings.__normalizeQuickExplainPromptTemplates([], "legacy prompt");
if (recoveredPrompts[0]?.id !== "default" || recoveredPrompts[0]?.content !== "legacy prompt") {
  throw new Error("prompt normalization: default template was not recovered from legacy prompt");
}
if (recoveredPrompts[1]?.id !== "ai-dictionary" || !recoveredPrompts[1]?.content.includes("{selectedText}")) {
  throw new Error("prompt normalization: protected AI dictionary template was not recovered");
}
const normalizedLookup = settingsSandbox.ReadingSpaceMN.settings.__mergeDictionaryLookup({}, {
  providerOrder: ["ai-translation", "bing"],
  defaultProvider: "ai-translation",
  pronunciation: { order: ["us", "uk"] },
});
if (Array.from(normalizedLookup.providerOrder).join(",") !== "ai-translation,bing,youdao") {
  throw new Error("lookup settings: provider order was not normalized and completed");
}
if (Array.from(normalizedLookup.pronunciation.order).join(",") !== "us,uk") {
  throw new Error("lookup settings: pronunciation order was not preserved");
}
if (!normalizedLookup.aiTranslation?.prompt.includes("{selectedText}")) {
  throw new Error("lookup settings: protected AI translation prompt was not recovered");
}

const instrumentedQuickExplain = quickExplain.replace(
  "webViewShouldStartLoad: webViewShouldStartLoad\n  };",
  "webViewShouldStartLoad: webViewShouldStartLoad,\n    __renderDictionaryHTML: renderDictionaryHTML,\n    __dictionaryInjectionScripts: dictionaryInjectionScripts,\n    __dictionaryAITranslationInjectionScripts: dictionaryAITranslationInjectionScripts,\n    __modeButtonX: modeButtonX,\n    __selectionModeButtonX: selectionModeButtonX,\n    __headerActionStartX: headerActionStartX\n  };",
);
const sandbox = {
  JSB: { defineClass: () => function QuickExplainDelegate() {} },
  Application: { sharedInstance: () => ({ appTheme: 1 }) },
  ReadingSpaceMN: {
    preferencePrefix: "test_",
    shortString: (value, limit) => String(value || "").slice(0, limit || 160),
    settings: {
      readAISettings: () => ({
        quickExplain: { panelTheme: "black" },
        dictionaryLookup: {
          providerOrder: ["youdao", "bing", "ai-translation"],
          defaultProvider: "youdao",
          aiTranslation: { enabled: true, prompt: "翻译：{selectedText}" },
          pronunciation: { enabled: true, order: ["uk", "us"] },
        },
      }),
      defaultAISettings: () => ({
        quickExplain: { panelTheme: "black", prompt: "" },
        dictionaryLookup: {
          providerOrder: ["youdao", "bing", "ai-translation"],
          defaultProvider: "youdao",
          aiTranslation: { enabled: true, prompt: "翻译：{selectedText}" },
          pronunciation: { enabled: true, order: ["uk", "us"] },
        },
      }),
    },
  },
};
vm.runInNewContext(instrumentedQuickExplain, sandbox, { filename: "RSQuickExplain.js" });
const compactPanelWidth = 320;
const compactActionStart = sandbox.ReadingSpaceMN.quickExplain.__headerActionStartX(compactPanelWidth);
const compactSelectionX = sandbox.ReadingSpaceMN.quickExplain.__selectionModeButtonX(compactPanelWidth);
const compactModeX = sandbox.ReadingSpaceMN.quickExplain.__modeButtonX(compactPanelWidth);
const compactActionEnd = compactActionStart + 4 * 26 + 3 * 6;
if (compactActionEnd > compactSelectionX
  || compactSelectionX + 42 + 6 > compactModeX
  || compactModeX + 42 > compactPanelWidth - 35) {
  throw new Error("quick explain header: compact controls overlap after adding the selection mode button");
}
const dictionaryHTML = sandbox.ReadingSpaceMN.quickExplain.__renderDictionaryHTML("contract-request", "example", "example");
for (const label of ["有道词典", "Bing 词典", "AI 翻译", "读音"]) {
  if (!dictionaryHTML.includes(label)) throw new Error(`dictionary HTML: missing ${label}`);
}
const dictionaryScriptMatch = dictionaryHTML.match(/<script>([\s\S]*)<\/script>/);
if (!dictionaryScriptMatch) throw new Error("dictionary HTML: embedded parser script missing");
if (dictionaryScriptMatch[1].includes("active!==provider&&!providers[active].result")) {
  throw new Error("dictionary tabs: a faster provider must not replace the configured or user-selected source");
}
new vm.Script(dictionaryScriptMatch[1], { filename: "quick-explain-dictionary-webview.js" });

const syntheticBase64 = "QUJD".repeat(115000);
const injectionScripts = sandbox.ReadingSpaceMN.quickExplain.__dictionaryInjectionScripts({
  provider: "bing",
  requestId: "contract-request",
  base64: syntheticBase64,
  error: "",
  statusCode: 200,
});
if (!Array.isArray(injectionScripts) || injectionScripts.length < 20) {
  throw new Error("dictionary injection: large provider payload was not chunked");
}
if (injectionScripts.some((script) => script.length > 20000)) {
  throw new Error("dictionary injection: a WebView script still exceeds 20 KB");
}
const receivedChunks = [];
let expectedTotal = 0;
const transportSandbox = {
  window: {
    __rsDictionaryReceiveChunk(provider, requestId, index, total, chunk) {
      if (provider !== "bing" || requestId !== "contract-request") return "stale";
      expectedTotal = total;
      receivedChunks[index] = chunk;
      return index === total - 1 ? "done" : "chunk";
    },
  },
};
injectionScripts.forEach((script, index) => {
  const result = vm.runInNewContext(script, transportSandbox, { filename: `dictionary-injection-${index}.js` });
  const expected = index === injectionScripts.length - 1 ? "done" : "chunk";
  if (result !== expected) throw new Error(`dictionary injection: chunk ${index} returned ${result}, expected ${expected}`);
});
if (expectedTotal !== injectionScripts.length || receivedChunks.join("") !== syntheticBase64) {
  throw new Error("dictionary injection: chunked payload did not round-trip exactly");
}

const syntheticTranslation = "译文".repeat(12000);
const translationScripts = sandbox.ReadingSpaceMN.quickExplain.__dictionaryAITranslationInjectionScripts({
  requestId: "contract-request",
  text: syntheticTranslation,
  error: "",
});
if (!Array.isArray(translationScripts) || translationScripts.length < 3) {
  throw new Error("AI translation injection: large translation was not chunked");
}
const translationChunks = [];
let translationTotal = 0;
const translationTransportSandbox = {
  window: {
    __rsDictionaryAITranslationChunk(requestId, index, total, chunk) {
      if (requestId !== "contract-request") return "stale";
      translationTotal = total;
      translationChunks[index] = chunk;
      return index === total - 1 ? "done" : "chunk";
    },
  },
};
translationScripts.forEach((script, index) => {
  const result = vm.runInNewContext(script, translationTransportSandbox, { filename: `translation-injection-${index}.js` });
  const expected = index === translationScripts.length - 1 ? "done" : "chunk";
  if (result !== expected) throw new Error(`AI translation injection: chunk ${index} returned ${result}, expected ${expected}`);
});
if (translationTotal !== translationScripts.length || translationChunks.join("") !== syntheticTranslation) {
  throw new Error("AI translation injection: chunked payload did not round-trip exactly");
}

console.log("quick explain dictionary contract: ok");
