const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");

const checks = [
  {
    file: "src/RSAudioPlayer.js",
    rules: [
      {
        pattern: /\baudio_player_focus\b/,
        message: "audio player must not expose a focus bridge command",
      },
      {
        pattern: /\bonRSAudioPlayerFocus\b/,
        message: "audio player must not register a native focus handler",
      },
      {
        pattern: /\bAUDIO_PLAYER_BASE_Z_POSITION\b|\bnextOverlayZPosition\b|\bmarkOverlayFocus\b|\boverlayZPosition\b/,
        message: "audio player must not use dynamic overlay z-order state",
      },
      {
        pattern: /layer\.zPosition/,
        message: "audio player must not write native layer.zPosition",
      },
    ],
  },
  {
    file: "src/audio-player.html",
    rules: [
      {
        pattern: /\baudio_player_focus\b/,
        message: "audio player WebView must not send focus bridge commands",
      },
      {
        pattern: /\brequestFocus\s*\(/,
        message: "audio player WebView must not request native focus from pointer events",
      },
      {
        pattern: /addEventListener\(\s*["'](?:pointerdown|mousedown|touchstart)["'][\s\S]{0,180}(?:requestFocus|audio_player_focus)/,
        message: "audio player WebView must not bind pointer/touch events to native focus",
      },
    ],
  },
  {
    file: "src/ReadingSpaceMNAddon.js",
    rules: [
      {
        pattern: /\bonRSAudioPlayerFocus\b/,
        message: "addon entry must not expose audio player focus actions",
      },
    ],
  },
  {
    file: "src/RSQuickExplain.js",
    rules: [
      {
        pattern: /\bQUICK_EXPLAIN_BASE_Z_POSITION\b|\bnextOverlayZPosition\b|\bmarkOverlayFocus\b|\boverlayZPosition\b/,
        message: "quick explain must not use dynamic overlay z-order state",
      },
      {
        pattern: /layer\.zPosition/,
        message: "quick explain must not write native layer.zPosition",
      },
    ],
  },
  {
    file: "src/RSSelectionToolbar.js",
    rules: [
      {
        pattern: /\boverlayZPosition\b|\bnextOverlayZPosition\b|\bmarkOverlayFocus\b/,
        message: "selection toolbar must not use dynamic overlay z-order state",
      },
      {
        pattern: /layer\.zPosition/,
        message: "selection toolbar must not write native layer.zPosition",
      },
    ],
  },
  {
    file: "src/WebPanelController.js",
    rules: [
      {
        pattern: /\bPANEL_Z_POSITION\b|\bfocusPanel\b/,
        message: "main WebPanel must not restore dynamic panel focus/z-order helpers",
      },
      {
        pattern: /layer\.zPosition/,
        message: "main WebPanel must not write native layer.zPosition",
      },
    ],
  },
];

function readSource(file) {
  const absolute = path.join(rootDir, file);
  try {
    return fs.readFileSync(absolute, "utf8");
  } catch (error) {
    throw new Error(`Missing guard target: ${file}`);
  }
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split(/\n/).length;
}

function relativeLuminance(hexColor) {
  const channels = hexColor.slice(1).match(/.{2}/g).map((value) => parseInt(value, 16) / 255);
  const linearChannels = channels.map((value) => (
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return (0.2126 * linearChannels[0])
    + (0.7152 * linearChannels[1])
    + (0.0722 * linearChannels[2]);
}

function contrastRatio(firstColor, secondColor) {
  const firstLuminance = relativeLuminance(firstColor);
  const secondLuminance = relativeLuminance(secondColor);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function functionBody(source, name, file) {
  const needle = `function ${name}`;
  const start = source.indexOf(needle);
  if (start < 0) throw new Error(`Missing function ${name} in ${file}`);
  const parameterOpen = source.indexOf("(", start + needle.length);
  if (parameterOpen < 0) throw new Error(`Missing parameters for ${name} in ${file}`);
  let parameterDepth = 0;
  let parameterClose = -1;
  for (let index = parameterOpen; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") parameterDepth += 1;
    else if (char === ")") {
      parameterDepth -= 1;
      if (parameterDepth === 0) {
        parameterClose = index;
        break;
      }
    }
  }
  if (parameterClose < 0) throw new Error(`Unterminated parameters for ${name} in ${file}`);
  const open = source.indexOf("{", parameterClose);
  if (open < 0) throw new Error(`Missing function body for ${name} in ${file}`);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, index);
    }
  }
  throw new Error(`Unterminated function ${name} in ${file}`);
}

const failures = [];

for (const check of checks) {
  const source = readSource(check.file);
  for (const rule of check.rules) {
    const match = rule.pattern.exec(source);
    if (!match) continue;
    failures.push({
      file: check.file,
      line: lineNumberAt(source, match.index),
      message: rule.message,
      match: match[0],
    });
  }
}

const panelFile = "src/WebPanelController.js";
const panelSource = readSource(panelFile);
const keepPanelBody = functionBody(panelSource, "keepPanelWithinStudyBounds", panelFile);
const minimizedBranchIndex = keepPanelBody.indexOf("controller._isMinimized === true");
const maximizedBranchIndex = keepPanelBody.indexOf("controller._isMaximized");
if (minimizedBranchIndex < 0 || maximizedBranchIndex < 0 || minimizedBranchIndex > maximizedBranchIndex) {
  failures.push({
    file: panelFile,
    line: lineNumberAt(panelSource, panelSource.indexOf("function keepPanelWithinStudyBounds")),
    message: "main WebPanel minimized layout must win over maximized layout",
    match: "keepPanelWithinStudyBounds state order",
  });
}

const toggleMinimizedBody = functionBody(panelSource, "toggleMinimizedFrame", panelFile);
const enteringMinimizeIndex = toggleMinimizedBody.indexOf("} else {");
const enteringMinimizeBody = enteringMinimizeIndex >= 0 ? toggleMinimizedBody.slice(enteringMinimizeIndex) : "";
if (!/_isMaximized\s*=\s*false/.test(enteringMinimizeBody)) {
  failures.push({
    file: panelFile,
    line: lineNumberAt(panelSource, panelSource.indexOf("function toggleMinimizedFrame")),
    message: "main WebPanel must clear maximized state when entering minimized state",
    match: "toggleMinimizedFrame maximize/minimize state conflict",
  });
}

try {
  const bounds = { x: 0, y: 0, width: 1200, height: 900 };
  const studyView = { bounds };
  const button = (title) => ({
    title,
    titleLabel: {},
    setTitleForState(nextTitle) { this.title = nextTitle; },
  });
  const context = {
    UIFont: { systemFontOfSize: (size) => size },
    Application: {
      sharedInstance: () => ({ studyController: () => ({ view: studyView }) }),
    },
    NSUserDefaults: {
      standardUserDefaults: () => ({ setObjectForKey() {} }),
    },
    PANEL_ON_KEY: "panel-on",
    SPLIT_WINDOW_VALIDATION_MODE: false,
    ReadingSpaceMN: {},
    getCurrentPanelBounds: () => bounds,
    createDefaultFrame: () => ({ x: 20, y: 20, width: 900, height: 700 }),
    normalizePanelFrame: (frame) => ({ ...frame }),
    normalizeMinimizedPanelFrame: (frame) => ({ ...frame, height: 40 }),
    applyRootFrame(controller, frame, persistPreferred) {
      controller.view.frame = { ...frame };
      if (persistPreferred !== false) controller._preferredFrame = { ...frame };
    },
    refreshWebPanelLayout() {},
    openFeatureWindow() {},
    saveWebPanelFrame() {},
    bringPanelToFront() {},
    applySavedOrDefaultFrame(controller) {
      context.applyRootFrame(controller, { x: 20, y: 20, width: 900, height: 700 }, true);
    },
    applyShellTheme() {},
    refreshSyncTitleStatus() {},
    selectNativeTab() {},
    scheduleBrowserPanelShowReload() {},
  };
  vm.createContext(context);
  vm.runInContext(`function syncPanelWindowControls(controller, source) {${functionBody(panelSource, "syncPanelWindowControls", panelFile)}}`, context);
  vm.runInContext(`function toggleMinimizedFrame(controller) {${toggleMinimizedBody}}`, context);
  vm.runInContext(`function togglePanelMaximize(controller) {${functionBody(panelSource, "togglePanelMaximize", panelFile)}}`, context);
  vm.runInContext(`function showPanel(controller) {${functionBody(panelSource, "showPanel", panelFile)}}`, context);

  const controller = {
    addon: { window: {} },
    view: {
      frame: { x: 20, y: 20, width: 900, height: 700 },
      hidden: false,
      superview: studyView,
      autoresizingMask: 0,
    },
    minimizeButton: button("—"),
    maximizeButton: button("↗"),
    _activeTab: 0,
    _isMinimized: false,
    _isMaximized: false,
  };

  context.toggleMinimizedFrame(controller);
  context.showPanel(controller);
  if (controller._isMinimized !== false
    || controller.minimizeButton.title !== "—"
    || controller.minimizeButton.accessibilityLabel !== "最小化窗口") {
    failures.push({
      file: panelFile,
      line: lineNumberAt(panelSource, panelSource.indexOf("function showPanel")),
      message: "expanded main WebPanel must show the minimize icon after reopening from minimized state",
      match: `state=${String(controller._isMinimized)} title=${String(controller.minimizeButton.title)}`,
    });
  }

  context.togglePanelMaximize(controller);
  if (controller._isMaximized !== true
    || controller.maximizeButton.title !== "↙"
    || controller.maximizeButton.accessibilityLabel !== "还原窗口") {
    failures.push({
      file: panelFile,
      line: lineNumberAt(panelSource, panelSource.indexOf("function togglePanelMaximize")),
      message: "maximized main WebPanel must show the restore control",
      match: `state=${String(controller._isMaximized)} title=${String(controller.maximizeButton.title)}`,
    });
  }
} catch (error) {
  failures.push({
    file: panelFile,
    line: lineNumberAt(panelSource, panelSource.indexOf("function showPanel")),
    message: "main WebPanel minimize/reopen control contract could not run",
    match: error && error.message || String(error),
  });
}

const resizeFile = "web/src/ResizableTextArea.jsx";
const resizeSource = readSource(resizeFile);
const resizeFunctions = [
  "startResize",
  "moveResize",
  "finishResize",
  "resizeWithKeyboard",
].map((name) => functionBody(resizeSource, name, resizeFile)).join("\n");
if (!/window\.addEventListener\(moveEventName,\s*moveResize/.test(resizeFunctions)
  || !/onMouseDown=\{startResize\}/.test(resizeSource)
  || !/onPointerDown=\{startResize\}/.test(resizeSource)
  || !/onTouchStart=\{startResize\}/.test(resizeSource)
  || !/Math\.min\(maximum,\s*Math\.max\(minimum,/.test(resizeSource)
  || !/edge\s*===\s*["']top["']\s*\?\s*-delta\s*:\s*delta/.test(resizeFunctions)) {
  failures.push({
    file: resizeFile,
    line: lineNumberAt(resizeSource, resizeSource.indexOf("function startResize")),
    message: "resizable textareas must keep mouse, pointer, touch, clamp, and edge-direction contracts",
    match: "resizable textarea interaction contract",
  });
}
if (/MNBridge\s*\.|overlayZPosition|layer\.zPosition/.test(resizeFunctions)) {
  failures.push({
    file: resizeFile,
    line: lineNumberAt(resizeSource, resizeSource.indexOf("function startResize")),
    message: "textarea resize must remain Web-only",
    match: "native bridge or z-order use in resize handlers",
  });
}

const appFile = "web/src/App.jsx";
const appSource = readSource(appFile);
const chatScrollFunctionNames = [
  "setChatAtBottom",
  "updateChatAtBottom",
  "scrollChatToLatest",
  "handleChatHistoryScroll",
];
const chatScrollFunctionBodies = Object.fromEntries(chatScrollFunctionNames.map((name) => [
  name,
  functionBody(appSource, name, appFile),
]));
const chatScrollFunctions = Object.values(chatScrollFunctionBodies).join("\n");
const loadChatStateBody = functionBody(appSource, "loadChatState", appFile);
if (!/CHAT_BOTTOM_THRESHOLD\s*=\s*48\s*;/.test(appSource)
  || !/if\s*\(!isActive\)\s*return/.test(chatScrollFunctionBodies.scrollChatToLatest)
  || !/if\s*\(force\)\s*chatForceLatestRef\.current\s*=\s*true/.test(chatScrollFunctionBodies.scrollChatToLatest)
  || !/if\s*\(!chatForceLatestRef\.current\s*&&\s*!chatAtBottomRef\.current\)\s*return/.test(chatScrollFunctionBodies.scrollChatToLatest)
  || !/requestAnimationFrame/.test(chatScrollFunctionBodies.scrollChatToLatest)
  || !/historyElement\.scrollTop\s*=\s*historyElement\.scrollHeight/.test(chatScrollFunctionBodies.scrollChatToLatest)
  || !/setShowScrollToLatest\(!atBottom\)/.test(chatScrollFunctionBodies.setChatAtBottom)
  || !/setChatAtBottom\(distanceFromBottom\s*<=\s*CHAT_BOTTOM_THRESHOLD\)/.test(chatScrollFunctionBodies.updateChatAtBottom)
  || !/updateChatAtBottom\(event\.currentTarget\)/.test(chatScrollFunctionBodies.handleChatHistoryScroll)
  || !/onScroll=\{handleChatHistoryScroll\}/.test(appSource)
  || !/className=["']chat-scroll-latest["']/.test(appSource)
  || !/aria-label=["']回到最新消息["']/.test(appSource)
  || !/onClick=\{\(\)\s*=>\s*scrollChatToLatest\(true\)\}/.test(appSource)
  || !/if\s*\(isActive\)\s*scrollChatToLatest\(true\);[\s\S]{0,100}\[isActive,\s*active\?\.id\]/.test(appSource)
  || !/if\s*\(sending\)\s*scrollChatToLatest\(true\)/.test(appSource)
  || !/scrollChatToLatest\(\);[\s\S]{0,100}\[messages\.length,\s*latestMessageContent\]/.test(appSource)
  || !/options\?\.source\s*===\s*["']web-tab-activated["']/.test(loadChatStateBody)
  || !/options\?\.source\s*===\s*["']panel-show["']/.test(loadChatStateBody)
  || !/forceLatestAfterLoadRef\.current\s*=\s*true/.test(loadChatStateBody)
  || !/forceLatestAfterLoadRef\.current\s*=\s*false;[\s\S]{0,100}scrollChatToLatest\(true\)/.test(appSource)
  || !/new\s+window\.ResizeObserver/.test(appSource)
  || !/<ChatTab\s+isActive=\{tab\s*===\s*1\}\s*\/>/.test(appSource)) {
  failures.push({
    file: appFile,
    line: lineNumberAt(appSource, appSource.indexOf("function ChatTab")),
    message: "AI chat must preserve smart latest-message following and its accessible return control",
    match: "AI chat latest-message scroll contract",
  });
}
if (/MNBridge\s*\.|overlayZPosition|layer\.zPosition/.test(chatScrollFunctions)) {
  failures.push({
    file: appFile,
    line: lineNumberAt(appSource, appSource.indexOf("function scrollChatToLatest")),
    message: "AI chat scrolling must remain Web-only",
    match: "native bridge or z-order use in chat scroll handlers",
  });
}
const messageCardOptionsMarkup = appSource.match(
  /<div\b(?=[^>]*\bclassName=["']message-card-options["'])[^>]*>[\s\S]*?<\/div>/,
)?.[0] || "";
const messageCardActionPatterns = [
  /addMessageToSelectedCard\s*\(\s*message\s*,\s*["']title["']\s*\)/g,
  /addMessageToSelectedCard\s*\(\s*message\s*,\s*["']comment["']\s*\)/g,
  /addMessageAsChildCard\s*\(\s*message\s*,\s*["']title["']\s*\)/g,
  /addMessageAsChildCard\s*\(\s*message\s*,\s*["']comment["']\s*\)/g,
  /addMessageAsSiblingCard\s*\(\s*message\s*,\s*["']title["']\s*\)/g,
  /addMessageAsSiblingCard\s*\(\s*message\s*,\s*["']comment["']\s*\)/g,
];
if (!/aria-label=["']加入卡片["']/.test(messageCardOptionsMarkup)
  || !/role=["']group["']/.test(messageCardOptionsMarkup)
  || !messageCardActionPatterns.every((pattern) => (
    (messageCardOptionsMarkup.match(pattern) || []).length === 1
    && (appSource.match(pattern) || []).length === 1
  ))) {
  failures.push({
    file: appFile,
    line: lineNumberAt(appSource, appSource.indexOf("message-card-options")),
    message: "AI message card writes must remain grouped behind the single 加入卡片 control",
    match: "AI message card action grouping contract",
  });
}

const deleteMessageFunctionName = /function\s+requestDeleteMessage\s*\(/.test(appSource)
  ? "requestDeleteMessage"
  : "deleteMessage";
const deleteMessageBody = functionBody(appSource, deleteMessageFunctionName, appFile);
const chatTabMarkupStart = appSource.search(/<section\s+className=["']chat-tab["']>/);
const chatTabMarkupEnd = appSource.indexOf("\nfunction App(", chatTabMarkupStart);
const chatTabMarkup = chatTabMarkupStart >= 0 && chatTabMarkupEnd > chatTabMarkupStart
  ? appSource.slice(chatTabMarkupStart, chatTabMarkupEnd)
  : "";
const messageActionsComponentBody = functionBody(appSource, "MessageActions", appFile);
const chatMessageMarkup = `${chatTabMarkup}\n${messageActionsComponentBody}`;
if (!/requestConfirm\s*\([\s\S]*?=>\s*\{[\s\S]*?runCommand\s*\(\s*["']chatDeleteMessage["']\s*,\s*payload\s*\)/.test(deleteMessageBody)
  || !new RegExp(`onClick=\\{\\(\\)\\s*=>\\s*${deleteMessageFunctionName}\\(\\s*message\\s*,\\s*index\\s*\\)\\}`).test(chatMessageMarkup)
  || /runCommand\s*\(\s*["']chatDeleteMessage["']/.test(chatMessageMarkup)) {
  failures.push({
    file: appFile,
    line: lineNumberAt(appSource, appSource.indexOf(`function ${deleteMessageFunctionName}`)),
    message: "single-message deletion must request confirmation before running chatDeleteMessage",
    match: "AI message deletion confirmation contract",
  });
}
const answerIsCollapsibleBody = functionBody(appSource, "answerIsCollapsible", appFile);
const answerCollapseKeyBody = functionBody(appSource, "answerCollapseKey", appFile);
const toggleMessageCollapsedBody = functionBody(appSource, "toggleMessageCollapsed", appFile);
const fullAnswerActionFunctions = [
  "quoteMessage",
  "readAssistantMessage",
  "addMessageToSelectedCard",
  "addMessageAsChildCard",
  "addMessageAsSiblingCard",
];
const fullAnswerActionBodies = fullAnswerActionFunctions.map((name) => (
  functionBody(appSource, name, appFile)
));
const collapseButtonIndex = chatMessageMarkup.indexOf('className="message-collapse-toggle"');
const deleteButtonIndex = chatMessageMarkup.indexOf('aria-label="删除消息"');
if (!/COLLAPSIBLE_ANSWER_MIN_LENGTH\s*=\s*800\s*;/.test(appSource)
  || !/COLLAPSIBLE_ANSWER_MIN_LINES\s*=\s*24\s*;/.test(appSource)
  || !/message\?\.role\s*!==\s*["']assistant["']/.test(answerIsCollapsibleBody)
  || !/content\.length\s*>=\s*COLLAPSIBLE_ANSWER_MIN_LENGTH/.test(answerIsCollapsibleBody)
  || !/COLLAPSIBLE_ANSWER_MIN_LINES/.test(answerIsCollapsibleBody)
  || !/conversationKey/.test(answerCollapseKeyBody)
  || !/message\?\.id/.test(answerCollapseKeyBody)
  || !/message\?\.timestamp/.test(answerCollapseKeyBody)
  || !/\^\(local_\|stream_\)/.test(answerCollapseKeyBody)
  || /index/.test(answerCollapseKeyBody)
  || !/setCollapsedMessageKeys/.test(toggleMessageCollapsedBody)
  || /MNBridge|localStorage|sessionStorage/.test(toggleMessageCollapsedBody)
  || !/hidden=\{messageCollapsed\}/.test(chatMessageMarkup)
  || !/aria-controls=\{messageContentId\}/.test(chatMessageMarkup)
  || !/aria-expanded=\{!messageCollapsed\}/.test(chatMessageMarkup)
  || !/messageCollapsed\s*\?\s*["']展开["']\s*:\s*["']收起["']/.test(chatMessageMarkup)
  || deleteButtonIndex < 0
  || collapseButtonIndex <= deleteButtonIndex
  || !/className=["']message-collapsed-placeholder["']/.test(chatMessageMarkup)
  || !/runCommand\s*\(\s*["']chatCopy["']\s*,\s*\{\s*content:\s*message\.content\s*\}/.test(chatMessageMarkup)
  || fullAnswerActionBodies.some((body) => !/message(?:\?\.|\.)content/.test(body))) {
  failures.push({
    file: appFile,
    line: lineNumberAt(appSource, appSource.indexOf("function answerIsCollapsible")),
    message: "long AI answers must collapse per stable message without truncating the original action payload",
    match: "AI long-answer collapse contract",
  });
}
const chatStatusBody = functionBody(appSource, "ChatStatus", appFile);
if (!/element\.scrollWidth\s*>\s*element\.clientWidth\s*\+\s*1/.test(chatStatusBody)
  || !/window\.ResizeObserver/.test(chatStatusBody)
  || !/window\.addEventListener\(\s*["']resize["']/.test(chatStatusBody)
  || !/window\.removeEventListener\(\s*["']resize["']/.test(chatStatusBody)
  || !/aria-live=["']polite["']/.test(chatStatusBody)
  || !/aria-controls=["']chat-status-text["']/.test(chatStatusBody)
  || !/aria-expanded=\{expanded\}/.test(chatStatusBody)
  || !/onClick=\{onToggle\}/.test(chatStatusBody)
  || !/expanded\s*\?\s*["']收起["']\s*:\s*["']详情["']/.test(chatStatusBody)
  || !/setStatusState\(\{\s*text,\s*expanded:\s*false\s*\}\)/.test(appSource)
  || !/setStatusState\(\(current\)\s*=>\s*\(\{\s*\.\.\.current,\s*expanded:\s*!current\.expanded\s*\}\)\)/.test(appSource)
  || !/<ChatStatus[\s\S]*?expanded=\{statusState\.expanded\}[\s\S]*?onToggle=\{toggleStatusExpanded\}[\s\S]*?status=\{status\}[\s\S]*?\/>/.test(chatTabMarkup)) {
  failures.push({
    file: appFile,
    line: lineNumberAt(appSource, appSource.indexOf("function ChatStatus")),
    message: "truncated AI chat status must expose a separate touch and keyboard details control that resets for every status event",
    match: "AI chat status details contract",
  });
}
const settingsFile = "web/src/pages/HomePage.jsx";
const settingsSource = readSource(settingsFile);
const chatFocusTargetBody = functionBody(appSource, "focusChatTarget", appFile);
const chatFocusShouldRecoverBody = functionBody(appSource, "chatFocusShouldRecover", appFile);
const restoreChatDropdownFocusBody = functionBody(appSource, "restoreChatDropdownFocus", appFile);
const requestChatConfirmBody = functionBody(appSource, "requestConfirm", appFile);
const cancelChatConfirmBody = functionBody(appSource, "cancelConfirm", appFile);
const runChatConfirmBody = functionBody(appSource, "runConfirm", appFile);
const selectChatModelBody = functionBody(appSource, "selectModel", appFile);
const selectHistoryConversationBody = functionBody(appSource, "selectHistoryConversation", appFile);
const chatOutsideInteractionBody = functionBody(appSource, "handleOutsideDropdownInteraction", appFile);
const chatDropdownKeyDownBody = functionBody(appSource, "handleDropdownKeyDown", appFile);
const messageCardMenuActionBody = functionBody(appSource, "runMessageCardMenuAction", appFile);
if (!/window\.requestAnimationFrame/.test(chatFocusTargetBody)
  || !/isConnected/.test(chatFocusTargetBody)
  || !/\.disabled/.test(chatFocusTargetBody)
  || !/closest\?\.\(["']\[hidden\]["']\)/.test(chatFocusTargetBody)
  || !/document\.activeElement/.test(chatFocusShouldRecoverBody)
  || !/activeElement\s*===\s*document\.body/.test(chatFocusShouldRecoverBody)
  || !/activeElement\.isConnected/.test(chatFocusShouldRecoverBody)
  || !/context\?\.returnFocus/.test(chatFocusShouldRecoverBody)
  || !/chatDropdownTriggerRef\.current\s*=\s*null/.test(restoreChatDropdownFocusBody)
  || !/document\.activeElement/.test(requestChatConfirmBody)
  || !/confirmFocusContextRef\.current/.test(requestChatConfirmBody)
  || !/focusAfterConfirm/.test(requestChatConfirmBody)
  || !/setConfirmRequest\(null\)/.test(cancelChatConfirmBody)
  || !/focusChatTarget/.test(cancelChatConfirmBody)
  || !/await\s+action\(\)/.test(runChatConfirmBody)
  || !/finally/.test(runChatConfirmBody)
  || !/context\.running/.test(runChatConfirmBody)
  || !/confirmFocusContextRef\.current\s*!==\s*context/.test(runChatConfirmBody)
  || !/result\s*!==\s*null\s*&&\s*!result\?\.error/.test(runChatConfirmBody)
  || !/chatFocusShouldRecover\(context\)/.test(runChatConfirmBody)
  || !/focusAfterConfirm/.test(runChatConfirmBody)
  || !/restoreChatDropdownFocus/.test(selectChatModelBody)
  || !/restoreChatDropdownFocus/.test(selectHistoryConversationBody)
  || !/event\.preventDefault\(\)/.test(chatDropdownKeyDownBody)
  || !/cancelConfirm\(\)/.test(chatDropdownKeyDownBody)
  || !/restoreChatDropdownFocus\(\)/.test(chatDropdownKeyDownBody)
  || /\.focus\s*\(/.test(chatOutsideInteractionBody)
  || messageCardMenuActionBody.indexOf("trigger.focus()") < 0
  || messageCardMenuActionBody.indexOf("trigger.focus()") > messageCardMenuActionBody.indexOf("action()")
  || !/requestAnimationFrame\(\(\)\s*=>\s*confirmCancelRef\.current\?\.focus\(\)\)/.test(appSource)
  || !/aria-controls=["']chat-history-panel["']/.test(appSource)
  || !/aria-expanded=\{historyOpen\}/.test(appSource)
  || !/className=["']history-panel["'][^>]*id=["']chat-history-panel["']/.test(appSource)
  || !/aria-controls=["']chat-model-options["']/.test(appSource)
  || !/id=["']chat-model-options["'][^>]*role=["']listbox["']/.test(appSource)
  || !/data-confirm-cancel=["']true["']/.test(appSource)
  || !/ref=\{confirmCancelRef\}/.test(appSource)
  || !/className=["']model-option["']\s+disabled\s+role=["']option["']/.test(appSource)
  || !/shouldRestoreModelFocus[\s\S]{0,300}focusChatTarget\(modelTriggerRef\.current\)/.test(appSource)
  || !/focusedInConfirmation[\s\S]{0,300}conversation-tab\.active/.test(appSource)) {
  failures.push({
    file: appFile,
    line: lineNumberAt(appSource, appSource.indexOf("function focusChatTarget")),
    message: "AI chat popovers and destructive confirmations must enter, restore, and recover keyboard focus without changing outside-focus behavior",
    match: "AI chat focus lifecycle contract",
  });
}

const modelOptionElementsBody = functionBody(appSource, "modelOptionElements", appFile);
const updateModelOptionTabStopBody = functionBody(appSource, "updateModelOptionTabStop", appFile);
const focusModelOptionBody = functionBody(appSource, "focusModelOption", appFile);
const modelTriggerKeyDownBody = functionBody(appSource, "handleModelTriggerKeyDown", appFile);
const modelOptionKeyDownBody = functionBody(appSource, "handleModelOptionKeyDown", appFile);
const modelKeyboardBodies = [
  updateModelOptionTabStopBody,
  focusModelOptionBody,
  modelTriggerKeyDownBody,
  modelOptionKeyDownBody,
].join("\n");
const modelListboxMarkup = chatTabMarkup.match(
  /<div\b(?=[^>]*\baria-label=["']AI 模型["'])(?=[^>]*\bclassName=["']model-options["'])(?=[^>]*\brole=["']listbox["'])[^>]*>/,
)?.[0] || "";
const modelOptionMarkupIndex = chatTabMarkup.indexOf("data-model-value={model.value}");
const modelOptionMarkup = modelOptionMarkupIndex >= 0
  ? chatTabMarkup.slice(modelOptionMarkupIndex - 200, modelOptionMarkupIndex + 700)
  : "";
if (!/querySelectorAll\(["']\.model-option:not\(:disabled\)["']\)/.test(modelOptionElementsBody)
  || !/option\.tabIndex\s*=\s*option === nextOption \? 0 : -1/.test(updateModelOptionTabStopBody)
  || !/modelOptionFocusRef\.current\s*=\s*nextOption\.dataset\.modelValue/.test(updateModelOptionTabStopBody)
  || !/nextOption\.focus\(\)/.test(updateModelOptionTabStopBody)
  || !/window\.requestAnimationFrame/.test(focusModelOptionBody)
  || !/chatDropdownTriggerRef\.current\s*!==\s*modelTriggerRef\.current/.test(focusModelOptionBody)
  || !/modelOptionsRef\.current\?\.hidden/.test(focusModelOptionBody)
  || !/getAttribute\(["']aria-selected["']\)\s*===\s*["']true["']/.test(focusModelOptionBody)
  || !/["']ArrowDown["']/.test(modelTriggerKeyDownBody)
  || !/["']ArrowUp["']/.test(modelTriggerKeyDownBody)
  || !/["']Home["']/.test(modelTriggerKeyDownBody)
  || !/["']End["']/.test(modelTriggerKeyDownBody)
  || !/event\.preventDefault\(\)/.test(modelTriggerKeyDownBody)
  || !/if\s*\(!modelSelectOpen\)/.test(modelTriggerKeyDownBody)
  || !/chatDropdownTriggerRef\.current\s*=\s*event\.currentTarget/.test(modelTriggerKeyDownBody)
  || !/setModelSelectOpen\(true\)/.test(modelTriggerKeyDownBody)
  || !/focusModelOption\(position\)/.test(modelTriggerKeyDownBody)
  || !/Math\.min\(options\.length - 1, currentIndex \+ 1\)/.test(modelOptionKeyDownBody)
  || !/Math\.max\(0, currentIndex - 1\)/.test(modelOptionKeyDownBody)
  || !/event\.preventDefault\(\)/.test(modelOptionKeyDownBody)
  || !/updateModelOptionTabStop\(options\[nextIndex\], true\)/.test(modelOptionKeyDownBody)
  || !modelListboxMarkup
  || !modelOptionMarkup
  || !/aria-label=\{`AI 模型：\$\{modelDisplayName\(selectedModel\) \|\| ["']未注入模型["']\}`\}/.test(chatTabMarkup)
  || !/data-model-value=\{model\.value\}/.test(modelOptionMarkup)
  || !/role=["']option["']/.test(modelOptionMarkup)
  || !/tabIndex=\{model\.value === modelOptionTabValue \? 0 : -1\}/.test(modelOptionMarkup)
  || !/aria-selected=\{model\.value === selectedModelValue\}/.test(modelOptionMarkup)
  || !/className=["']model-option["']\s+disabled\s+role=["']option["']/.test(chatTabMarkup)
  || /aria-activedescendant|role=["']combobox["']/.test(chatTabMarkup)
  || /MNBridge\s*\.|overlayZPosition|layer\.zPosition/.test(modelKeyboardBodies)) {
  failures.push({
    file: appFile,
    line: lineNumberAt(appSource, appSource.indexOf("function modelOptionElements")),
    message: "AI model listbox must keep one option in the Tab order and support bounded arrow, Home, and End navigation without native focus calls",
    match: "AI model listbox keyboard contract",
  });
}

const messageToolbarActionsBody = functionBody(appSource, "messageToolbarActions", appFile);
const messageActionFocusBody = functionBody(appSource, "handleMessageActionFocus", appFile);
const messageActionBlurBody = functionBody(appSource, "handleMessageActionBlur", appFile);
const messageActionsKeyDownBody = functionBody(appSource, "handleMessageActionsKeyDown", appFile);
const messageToolbarKeyboardBodies = [
  messageToolbarActionsBody,
  messageActionFocusBody,
  messageActionBlurBody,
  messageActionsKeyDownBody,
].join("\n");
const messageToolbarMarkup = chatMessageMarkup.match(
  /<div\b(?=[^>]*\bclassName=["']message-actions["'])(?=[^>]*\brole=["']toolbar["'])[^>]*>/,
)?.[0] || "";
const messageActionKeys = ["copy", "quote", "edit", "regenerate", "read", "delete", "collapse", "card"];
const messageActionsHaveRovingTabStops = messageActionKeys.every((key) => (
  new RegExp(`data-message-action=["']${key}["'][\\s\\S]{0,300}tabIndex=\\{effectiveActionKey === ["']${key}["'] \\? 0 : -1\\}`).test(chatMessageMarkup)
));
const deleteRovingFallbackIndex = deleteMessageBody.indexOf('[data-message-action][tabindex="0"]');
const deleteFirstActionFallbackIndex = deleteMessageBody.indexOf(
  ".message-actions [data-message-action]:not([hidden]):not(:disabled)",
);
const deleteComposerFallbackIndex = deleteMessageBody.indexOf("composerInputRef.current");
if (!/querySelectorAll\(["']\[data-message-action\]["']\)/.test(messageToolbarActionsBody)
  || !/!action\.disabled\s*&&\s*!action\.hidden/.test(messageToolbarActionsBody)
  || !/action\.closest\(["']\.message-actions["']\)\s*===\s*toolbar/.test(messageToolbarActionsBody)
  || !/useState\(initialActionKey \|\| ["']copy["']\)/.test(messageActionsComponentBody)
  || !/actionKeys\.includes\(activeActionKey\)\s*\?\s*activeActionKey\s*:\s*actionKeys\[0\]/.test(messageActionsComponentBody)
  || !/useLayoutEffect\(\(\)\s*=>/.test(messageActionsComponentBody)
  || !/focusedActionKeyRef\.current\s*===\s*activeActionKey/.test(messageActionsComponentBody)
  || !/setActiveActionKey\(effectiveActionKey\)/.test(messageActionsComponentBody)
  || !/nextAction\.focus\(\)/.test(messageActionsComponentBody)
  || !/setActiveActionKey\(actionKey\)/.test(messageActionFocusBody)
  || !/onActionFocus\(actionKey\)/.test(messageActionFocusBody)
  || !/event\.currentTarget\.contains\(event\.relatedTarget\)/.test(messageActionBlurBody)
  || !/toolbarHadFocusRef\.current\s*=\s*false/.test(messageActionBlurBody)
  || !/["']ArrowLeft["']/.test(messageActionsKeyDownBody)
  || !/["']ArrowRight["']/.test(messageActionsKeyDownBody)
  || !/["']Home["']/.test(messageActionsKeyDownBody)
  || !/["']End["']/.test(messageActionsKeyDownBody)
  || !/%\s*actions\.length/.test(messageActionsKeyDownBody)
  || !/event\.preventDefault\(\)/.test(messageActionsKeyDownBody)
  || !/setActiveActionKey\(nextAction\.dataset\.messageAction\)/.test(messageActionsKeyDownBody)
  || !/nextAction\.focus\(\)/.test(messageActionsKeyDownBody)
  || /ArrowUp|ArrowDown|["']Tab["']|["']Enter["']|["']Space["']/.test(messageActionsKeyDownBody)
  || !messageToolbarMarkup
  || !/aria-orientation=["']horizontal["']/.test(messageToolbarMarkup)
  || !/aria-label=\{`第 \$\{index \+ 1\} 条\$\{message\.role === ["']assistant["'] \? ["'] AI 回复["'] : ["']用户消息["']\}操作`\}/.test(messageToolbarMarkup)
  || !/data-message-key=\{messageKey\}/.test(messageToolbarMarkup)
  || !messageActionsHaveRovingTabStops
  || !/role=["']group["']/.test(messageCardOptionsMarkup)
  || /role=["']menu(?:item)?["']|tabIndex=/.test(messageCardOptionsMarkup)
  || deleteRovingFallbackIndex < 0
  || deleteFirstActionFallbackIndex <= deleteRovingFallbackIndex
  || deleteComposerFallbackIndex <= deleteFirstActionFallbackIndex
  || !/:not\(\[hidden\]\):not\(:disabled\)/.test(deleteMessageBody)
  || /\.tabIndex\s*=/.test(messageToolbarKeyboardBodies)
  || /MNBridge\s*\.|overlayZPosition|layer\.zPosition/.test(messageToolbarKeyboardBodies)) {
  failures.push({
    file: appFile,
    line: lineNumberAt(appSource, appSource.indexOf("function messageToolbarActions")),
    message: "each AI message action toolbar must keep one Tab stop, provide horizontal roving navigation, and preserve ordinary card-option Tab order",
    match: "AI message action toolbar keyboard contract",
  });
}

const settingsFocusTargetUsableBody = functionBody(settingsSource, "settingsFocusTargetIsUsable", settingsFile);
const focusSettingsTargetBody = functionBody(settingsSource, "focusSettingsTarget", settingsFile);
const toggleCustomSelectBody = functionBody(settingsSource, "toggleCustomSelect", settingsFile);
const restoreCustomSelectFocusBody = functionBody(settingsSource, "restoreCustomSelectFocus", settingsFile);
const prepareSettingsConfirmationBody = functionBody(settingsSource, "prepareSettingsConfirmation", settingsFile);
const dismissSettingsConfirmationBody = functionBody(settingsSource, "dismissSettingsConfirmation", settingsFile);
const requestSaveSyncNowBody = functionBody(settingsSource, "requestSaveSyncNow", settingsFile);
const settingsOutsideInteractionBody = functionBody(settingsSource, "handleOutsideSelectInteraction", settingsFile);
const settingsSelectOptionClickBody = functionBody(settingsSource, "handleSelectOptionClick", settingsFile);
const settingsSelectKeyDownBody = functionBody(settingsSource, "handleSelectKeyDown", settingsFile);
const focusAfterListRemovalBody = functionBody(settingsSource, "focusAfterListRemoval", settingsFile);
const settingsSelectPairs = [
  ["modelOptions", "modelOptions"],
];
const settingsConfirmationKeys = [
  "browser-login",
  "risk-bucket",
  "sync-upload",
  "sync-pull",
  "settings-import",
];
const asynchronousConfirmationFunctions = [
  "importSettings",
  "clearBrowserLoginData",
  "saveSyncNow",
  "pullSyncFromCloud",
].map((name) => functionBody(settingsSource, name, settingsFile));
const dynamicRemovalFunctions = [
  "removeEnabledModel",
  "removeQuickPrompt",
  "removeQuickTemplate",
].map((name) => functionBody(settingsSource, name, settingsFile));
if (!/isConnected/.test(settingsFocusTargetUsableBody)
  || !/\.disabled/.test(settingsFocusTargetUsableBody)
  || !/getClientRects\(\)\.length\s*>\s*0/.test(settingsFocusTargetUsableBody)
  || !/window\.requestAnimationFrame/.test(focusSettingsTargetBody)
  || !/openCustomSelectTriggerRef\.current\s*=\s*nextOpen\s*\?\s*trigger\s*:\s*null/.test(toggleCustomSelectBody)
  || !/focusSettingsTarget\(trigger\)/.test(restoreCustomSelectFocusBody)
  || !/settingsConfirmReturnFocusRef\.current/.test(prepareSettingsConfirmationBody)
  || !/closeAllSettingsConfirmations\(\)/.test(prepareSettingsConfirmationBody)
  || !/setSettingsConfirmationRevision/.test(prepareSettingsConfirmationBody)
  || !/closeAllSettingsConfirmations\(\)/.test(dismissSettingsConfirmationBody)
  || !/focusSettingsTarget\(returnFocus\)/.test(dismissSettingsConfirmationBody)
  || !/dismissSettingsConfirmation\(\{\s*restoreFocus:\s*false\s*\}\)/.test(requestSaveSyncNowBody)
  || !/wrapper\?\.contains\(target\)/.test(settingsOutsideInteractionBody)
  || /\.focus\s*\(/.test(settingsOutsideInteractionBody)
  || !/restoreCustomSelectFocus\(\)/.test(settingsSelectOptionClickBody)
  || !/\.global-model-options button:not\(:disabled\)/.test(settingsSelectOptionClickBody)
  || !/activeSettingsConfirmationRef\.current/.test(settingsSelectKeyDownBody)
  || !/dismissSettingsConfirmation\(\)/.test(settingsSelectKeyDownBody)
  || !/\.global-model-options:not\(\[hidden\]\)/.test(settingsSelectKeyDownBody)
  || !/restoreCustomSelectFocus\(\)/.test(settingsSelectKeyDownBody)
  || !/focusSettingsTarget\(\(\)\s*=>/.test(focusAfterListRemovalBody)
  || settingsSelectPairs.some(([controlsId, panelId]) => (
    !settingsSource.includes(`aria-controls="${controlsId}"`)
      || !settingsSource.includes(`id="${panelId}"`)
  ))
  || settingsConfirmationKeys.some((key) => (
    (settingsSource.match(new RegExp(`data-settings-confirm=["']${key}["']`, "g")) || []).length !== 1
  ))
  || (settingsSource.match(/data-confirm-cancel=["']true["']/g) || []).length !== 5
  || !/querySelector\(`\[data-settings-confirm=/.test(settingsSource)
  || !/settingsFocusTargetIsUsable\(cancelButton\)[\s\S]{0,80}cancelButton\.focus\(\)/.test(settingsSource)
  || !/activeSettingsConfirmationKey\s*\|\|\s*loading/.test(settingsSource)
  || !/dialog\?\.contains\(document\.activeElement\)/.test(settingsSource)
  || !/\[activeSettingsConfirmationKey,\s*settingsConfirmationRevision,\s*loading\]/.test(settingsSource)
  || (settingsSource.match(/prepareSettingsConfirmation\(event\?\.currentTarget\)/g) || []).length < 5
  || asynchronousConfirmationFunctions.some((body) => !/finally/.test(body) || !/focusSettingsTarget\(returnFocus\)/.test(body))
  || dynamicRemovalFunctions.some((body) => !/focusAfterListRemoval\(/.test(body))
  || !/focusSettingsTarget\(\(\)\s*=>\s*document\.querySelector\(["']#testSelectedModelsButton["']\)\)/.test(
    functionBody(settingsSource, "removeFailedProviderModels", settingsFile),
  )
  || !/id=["']aiCoreModelsTab["']/.test(settingsSource)
  || !/id=["']addQuickPromptButton["']/.test(settingsSource)
  || !/id=["']addQuickTemplateButton["']/.test(settingsSource)) {
  failures.push({
    file: settingsFile,
    line: lineNumberAt(settingsSource, settingsSource.indexOf("function settingsFocusTargetIsUsable")),
    message: "settings popovers, confirmations, and dynamic removals must preserve one visible connected keyboard focus target",
    match: "settings focus lifecycle contract",
  });
}

const selectInputBody = functionBody(settingsSource, "SelectInput", settingsFile);
const settingsFieldBody = functionBody(settingsSource, "Field", settingsFile);
const renderAudioSelectBody = functionBody(settingsSource, "renderAudioSelect", settingsFile);
const settingsSelectMarkups = settingsSource.match(/<SelectInput\b[\s\S]*?<\/SelectInput>/g) || [];
const explicitSettingsSelectIds = [
  "rsButtonBehavior",
  "selectionToolbarDisplayMode",
  "providerSelect",
  "chatSendShortcut",
  "quickExplainModel",
  "quickExplainPanelTheme",
  "dictionaryLookupDefaultProvider",
  "dictionaryLookupTranslationModel",
  "dictionaryLookupPronunciationOrder",
];
const audioSettingsSelectIds = [
  "audioCardReadScope",
  "audioProvider",
  "audioAliyunModel",
  "audioAliyunVoice",
  "audioAliyunLanguage",
  "audioGeminiVoice",
  "audioMiniMaxModel",
  "audioMiniMaxVoice",
  "audioMiniMaxLanguage",
  "audioBridgeMode",
];
const removedCustomSelectStateNames = [
  "providerSelectOpen",
  "audioSelectOpen",
  "rsButtonBehaviorOpen",
  "chatSendShortcutOpen",
  "quickExplainModelOpen",
  "quickExplainPanelThemeOpen",
  "toggleAudioSelect",
];
const explicitSettingsSelectsValid = explicitSettingsSelectIds.every((id) => {
  const markup = settingsSelectMarkups.find((candidate) => candidate.includes(`id="${id}"`)) || "";
  return /className=["']settings-select["']/.test(markup)
    && /onChange=/.test(markup)
    && /value=/.test(markup)
    && !/onKeyDown=|aria-controls=|aria-expanded=/.test(markup);
});
const settingsSelectEnabledIndexBody = functionBody(settingsSource, "settingsSelectEnabledIndex", settingsFile);
const settingsSelectShouldOpenAboveBody = functionBody(settingsSource, "settingsSelectShouldOpenAbove", settingsFile);
try {
  const context = { Math, Number };
  vm.createContext(context);
  vm.runInContext(`function settingsSelectEnabledIndex(options, startIndex, step) {${settingsSelectEnabledIndexBody}}`, context);
  vm.runInContext(`function settingsSelectShouldOpenAbove(rect, viewportHeight, optionCount) {${settingsSelectShouldOpenAboveBody}}`, context);
  const sampleOptions = [{ disabled: false }, { disabled: true }, { disabled: false }];
  const allDisabledOptions = [{ disabled: true }, { disabled: true }];
  if (context.settingsSelectEnabledIndex(sampleOptions, -1, 1) !== 0
    || context.settingsSelectEnabledIndex(sampleOptions, 0, 1) !== 2
    || context.settingsSelectEnabledIndex(sampleOptions, 0, -1) !== 2
    || context.settingsSelectEnabledIndex(allDisabledOptions, -1, 1) !== -1
    || context.settingsSelectShouldOpenAbove({ top: 400, bottom: 434 }, 600, 6) !== true
    || context.settingsSelectShouldOpenAbove({ top: 100, bottom: 134 }, 600, 6) !== false) {
    throw new Error("shared settings listbox navigation returned an unexpected index or direction");
  }
} catch (error) {
  failures.push({
    file: settingsFile,
    line: lineNumberAt(settingsSource, settingsSource.indexOf("function settingsSelectEnabledIndex")),
    message: "shared settings listbox navigation and viewport direction must pass the runnable regression contract",
    match: error && error.message || String(error),
  });
}
if (/<select\b/.test(selectInputBody)
  || !/role=["']combobox["']/.test(selectInputBody)
  || !/aria-controls=\{listboxId\}/.test(selectInputBody)
  || !/aria-expanded=\{open\}/.test(selectInputBody)
  || !/aria-haspopup=["']listbox["']/.test(selectInputBody)
  || !/aria-activedescendant=/.test(selectInputBody)
  || !/role=["']listbox["']/.test(selectInputBody)
  || !/role=["']option["']/.test(selectInputBody)
  || !/aria-selected=\{option\.value === normalizedValue\}/.test(selectInputBody)
  || !/disabled=\{disabled\}/.test(selectInputBody)
  || !/disabled=\{option\.disabled\}/.test(selectInputBody)
  || !/child\.props\.disabled === true/.test(functionBody(settingsSource, "settingsSelectOptionList", settingsFile))
  || !/onClick=\{\(\) => commitSettingsSelectOption\(index\)\}/.test(selectInputBody)
  || !/key === ["']ArrowDown["'][\s\S]{0,220}settingsSelectEnabledIndex/.test(selectInputBody)
  || !/key === ["']Enter["'][\s\S]{0,180}commitSettingsSelectOption/.test(selectInputBody)
  || !/key === ["']Escape["'][\s\S]{0,140}closeSettingsSelect/.test(selectInputBody)
  || !/wrapperRef\.current\?\.contains\(event\.target\)/.test(selectInputBody)
  || !/const passiveCapture = \{ capture: true, passive: true \}/.test(selectInputBody)
  || !/document\.addEventListener\(["']scroll["'],\s*handleOutsideScroll,\s*passiveCapture\)/.test(selectInputBody)
  || !/window\.addEventListener\(["']resize["']/.test(selectInputBody)
  || settingsSelectMarkups.length !== 10
  || !explicitSettingsSelectsValid
  || (settingsSource.match(/\{renderAudioSelect\(\{/g) || []).length !== 10
  || audioSettingsSelectIds.some((id) => !settingsSource.includes(`inputId: "${id}"`))
  || !/<SelectInput[\s\S]*?id=\{inputId\}[\s\S]*?onChange=\{\(event\)\s*=>\s*onSelect\(event\.target\.value\)\}[\s\S]*?value=\{hasCurrentValue \? normalizedValue : ["']["']\}/.test(renderAudioSelectBody)
  || !/options\.some\(\(option\)\s*=>\s*String\(option\.value\)\s*===\s*normalizedValue\)/.test(renderAudioSelectBody)
  || !/<option\s+disabled=\{unavailable\}\s+key=\{option\.value\}\s+value=\{option\.value\}>/.test(renderAudioSelectBody)
  || /onKeyDown=|onKeyUp=|onKeyPress=|aria-controls=|aria-expanded=/.test(renderAudioSelectBody)
  || !/const labelId = useId\(\)/.test(settingsFieldBody)
  || !/nextProps\[["']aria-labelledby["']\]\s*=\s*labelId/.test(settingsFieldBody)
  || !/nextProps\[["']aria-describedby["']\]\s*=\s*descId/.test(settingsFieldBody)
  || !/cloneElement\(child, nextProps\)/.test(settingsFieldBody)
  || !/id=\{labelId\}/.test(settingsFieldBody)
  || !/className=["']settings-select["']\s+disabled=\{ai\.quickExplain\?\.useCustomAI !== true \|\| !enabledModels\.length\}/.test(settingsSource)
  || !/value=\{quickExplainModelItem \? quickExplainModel : ["']["']\}/.test(settingsSource)
  || !/!providers\.includes\(provider\)[\s\S]{0,160}<option disabled value=\{provider\}>/.test(settingsSource)
  || removedCustomSelectStateNames.some((name) => settingsSource.includes(name))
  || !/aria-controls=["']modelOptions["']/.test(settingsSource)
  || !/className=["']custom-select-options global-model-options["']/.test(settingsSource)
  || /MNBridge\s*\.|overlayZPosition|layer\.zPosition/.test(`${selectInputBody}\n${renderAudioSelectBody}`)) {
  failures.push({
    file: settingsFile,
    line: lineNumberAt(settingsSource, settingsSource.indexOf("function SelectInput")),
    message: "the 19 select-only settings controls must use the shared labelled Web listbox so MarginNote never depends on a native select popup",
    match: "settings Web listbox interaction contract",
  });
}

const globalModelOptionKeyBody = functionBody(settingsSource, "globalModelOptionKey", settingsFile);
const globalModelOptionIdBody = functionBody(settingsSource, "globalModelOptionId", settingsFile);
const globalModelInputChangeBody = functionBody(settingsSource, "handleGlobalModelInputChange", settingsFile);
const globalModelCommitBody = functionBody(settingsSource, "commitGlobalModelOption", settingsFile);
const globalModelToggleBody = functionBody(settingsSource, "toggleGlobalModelOptions", settingsFile);
const globalModelMoveBody = functionBody(settingsSource, "moveGlobalModelActiveOption", settingsFile);
const globalModelKeyDownBody = functionBody(settingsSource, "handleGlobalModelInputKeyDown", settingsFile);
const globalModelEditorStart = settingsSource.indexOf('<div className="global-model-editor old-global-model-editor">');
const globalModelEditorEnd = globalModelEditorStart >= 0
  ? settingsSource.indexOf("</Field>", globalModelEditorStart)
  : -1;
const globalModelEditorMarkup = globalModelEditorStart >= 0 && globalModelEditorEnd > globalModelEditorStart
  ? settingsSource.slice(globalModelEditorStart, globalModelEditorEnd)
  : "";
const globalModelWebOnlyBodies = [
  globalModelOptionKeyBody,
  globalModelOptionIdBody,
  globalModelInputChangeBody,
  globalModelCommitBody,
  globalModelToggleBody,
  globalModelMoveBody,
  globalModelKeyDownBody,
].join("\n");
const globalModelInputClearIndex = globalModelInputChangeBody.indexOf('setGlobalModelActiveKey("")');
const globalModelInputUpdateIndex = globalModelInputChangeBody.indexOf("updateGlobalModelInput(event.target.value)");
const forbiddenGlobalModelEditingKeys = [
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "Backspace",
  "Delete",
  "Tab",
];
if (!/String\(provider\s*\|\|\s*["']["']\)/.test(globalModelOptionKeyBody)
  || !/\\u0000/.test(globalModelOptionKeyBody)
  || !/String\(model\s*\|\|\s*["']["']\)/.test(globalModelOptionKeyBody)
  || !/globalModelOptionKey\(provider,\s*model\)/.test(globalModelOptionIdBody)
  || !/codePointAt\(0\)\.toString\(36\)/.test(globalModelOptionIdBody)
  || !/role=["']combobox["']/.test(globalModelEditorMarkup)
  || !/aria-autocomplete=["']none["']/.test(globalModelEditorMarkup)
  || !/aria-controls=["']modelOptions["']/.test(globalModelEditorMarkup)
  || !/aria-expanded=\{globalModelSelectOpen\}/.test(globalModelEditorMarkup)
  || !/aria-activedescendant=\{globalModelActiveOptionId\}/.test(globalModelEditorMarkup)
  || !/ref=\{globalModelInputRef\}/.test(globalModelEditorMarkup)
  || !/onChange=\{handleGlobalModelInputChange\}/.test(globalModelEditorMarkup)
  || !/onKeyDown=\{handleGlobalModelInputKeyDown\}/.test(globalModelEditorMarkup)
  || !/onClick=\{toggleGlobalModelOptions\}/.test(globalModelEditorMarkup)
  || !/className=["']model-select-toggle["'][\s\S]{0,180}tabIndex=\{-1\}/.test(globalModelEditorMarkup)
  || !/id=["']modelOptions["'][\s\S]{0,80}role=["']listbox["']/.test(globalModelEditorMarkup)
  || !/id=\{globalModelOptionId\(item\.provider,\s*item\.model\)\}/.test(globalModelEditorMarkup)
  || !/key=\{globalModelOptionId\(item\.provider,\s*item\.model\)\}/.test(globalModelEditorMarkup)
  || !/role=["']option["']/.test(globalModelEditorMarkup)
  || !/aria-selected=\{globalModelOptionKey\(item\.provider,\s*item\.model\)\s*===\s*globalModelActiveKey\}/.test(globalModelEditorMarkup)
  || !/onClick=\{\(\)\s*=>\s*commitGlobalModelOption\(item\)\}/.test(globalModelEditorMarkup)
  || !/onMouseDown=\{\(event\)\s*=>\s*event\.preventDefault\(\)\}/.test(globalModelEditorMarkup)
  || !/role=["']option["'][\s\S]{0,80}tabIndex=\{-1\}/.test(globalModelEditorMarkup)
  || globalModelInputClearIndex < 0
  || globalModelInputUpdateIndex < 0
  || globalModelInputClearIndex > globalModelInputUpdateIndex
  || !/selectGlobalModel\(item\.provider,\s*item\.model\)/.test(globalModelCommitBody)
  || !/openCustomSelectTriggerRef\.current\s*=\s*globalModelInputRef\.current/.test(globalModelCommitBody)
  || !/restoreCustomSelectFocus\(\)/.test(globalModelCommitBody)
  || !/const input\s*=\s*globalModelInputRef\.current/.test(globalModelToggleBody)
  || !/toggleCustomSelect\(["']globalModel["'],\s*globalModelSelectOpen,\s*setGlobalModelSelectOpen,\s*input\)/.test(globalModelToggleBody)
  || !/focusSettingsTarget\(input\)/.test(globalModelToggleBody)
  || !/setGlobalModelSelectOpen\(true\)/.test(globalModelMoveBody)
  || !/globalModelActiveIndex\s*<\s*0/.test(globalModelMoveBody)
  || !/Math\.max\(0,\s*Math\.min\(globalModelItems\.length\s*-\s*1,/.test(globalModelMoveBody)
  || !/setGlobalModelActiveKey\(globalModelOptionKey\(nextItem\.provider,\s*nextItem\.model\)\)/.test(globalModelMoveBody)
  || /\b(?:mutate|updateGlobalModelInput|selectGlobalModel|commitGlobalModelOption)\s*\(|MNBridge\s*\./.test(globalModelMoveBody)
  || !/event\.key\s*===\s*["']ArrowDown["']\s*\|\|\s*event\.key\s*===\s*["']ArrowUp["']/.test(globalModelKeyDownBody)
  || !/event\.preventDefault\(\)[\s\S]{0,120}moveGlobalModelActiveOption/.test(globalModelKeyDownBody)
  || !/event\.key\s*===\s*["']Enter["'][\s\S]{0,120}globalModelActiveItem/.test(globalModelKeyDownBody)
  || !/commitGlobalModelOption\(globalModelActiveItem\)/.test(globalModelKeyDownBody)
  || forbiddenGlobalModelEditingKeys.some((key) => globalModelKeyDownBody.includes(`event.key === "${key}"`)
    || globalModelKeyDownBody.includes(`event.key === '${key}'`))
  || /event\.key\s*===\s*["']Escape["']/.test(globalModelKeyDownBody)
  || !/document\.getElementById\(globalModelActiveOptionId\)\?\.scrollIntoView\(\{\s*block:\s*["']nearest["']\s*\}\)/.test(settingsSource)
  || /webkit\.messageHandlers|MNBridge\s*\.|audio_player_focus|overlayZPosition|layer\.zPosition/.test(globalModelWebOnlyBodies)) {
  failures.push({
    file: settingsFile,
    line: lineNumberAt(settingsSource, Math.max(0, globalModelEditorStart)),
    message: "the editable global-model combobox must keep one input Tab stop, explicit listbox semantics, preview-only arrows, commit-only Enter/click, and Web-only focus behavior",
    match: "editable global-model combobox contract",
  });
}

if (!/composer-input-resizable/.test(appSource)
  || !/resizeEdge=["']top["']/.test(appSource)
  || !/quick-prompt-resizable/.test(settingsSource)
  || !/minHeight=\{expanded\s*\?\s*180\s*:\s*58\}/.test(settingsSource)
  || !/quick-explain-template-resizable/.test(settingsSource)
  || !/minHeight=\{expanded\s*\?\s*180\s*:\s*72\}/.test(settingsSource)
  || !/settings-backup-resizable/.test(settingsSource)
  || !/developer-diagnostic-resizable/.test(settingsSource)) {
  failures.push({
    file: appFile,
    line: lineNumberAt(appSource, appSource.indexOf("function ChatTab")),
    message: "all editable multiline surfaces must use the shared resize component and preserve prompt expand/collapse heights",
    match: "resizable textarea consumer contract",
  });
}

const settingsStylesFile = "web/src/styles.css";
const settingsStylesSource = readSource(settingsStylesFile);
const settingsSelectTriggerStyle = settingsStylesSource.match(
  /\.settings-input\.settings-select\s*\{([^}]*)\}/,
)?.[1] || "";
if (!/color:\s*var\(--muted\);/.test(settingsSelectTriggerStyle)
  || !/background:\s*transparent;/.test(settingsSelectTriggerStyle)
  || !/text-align:\s*right;/.test(settingsSelectTriggerStyle)
  || !/cursor:\s*pointer;/.test(settingsSelectTriggerStyle)
  || !/\.settings-input\.settings-select:disabled\s*\{[^}]*opacity:\s*0\.6;[^}]*\}/.test(settingsStylesSource)
  || !/\.custom-select-wrapper\.settings-select-wrapper\s*\{[^}]*min-width:\s*0;[^}]*\}/.test(settingsStylesSource)
  || !/\.custom-select-options\.settings-select-options\s*\{[^}]*box-sizing:\s*border-box;[^}]*width:\s*100%;[^}]*min-width:\s*0;[^}]*max-width:\s*100%;[^}]*\}/.test(settingsStylesSource)
  || !/\.settings-select-wrapper\.opens-above\s+\.settings-select-options\s*\{[^}]*bottom:\s*100%;[^}]*\}/.test(settingsStylesSource)
  || !/\.settings-select-option\s*\{[^}]*overflow-wrap:\s*anywhere;[^}]*\}/.test(settingsStylesSource)) {
  failures.push({
    file: settingsStylesFile,
    line: lineNumberAt(settingsStylesSource, settingsStylesSource.indexOf(".settings-input.settings-select")),
    message: "settings Web listboxes must preserve compact styling, disabled states, shared boundaries, narrow-width containment, and upward opening",
    match: "settings Web listbox style contract",
  });
}
if (!/\.custom-option\.is-active,\s*\n\.custom-option\[aria-selected=["']true["']\]\s*\{[^}]*color:\s*var\(--accent\);[^}]*background:\s*var\(--accent-glow\);[^}]*\}/.test(settingsStylesSource)) {
  failures.push({
    file: settingsStylesFile,
    line: lineNumberAt(settingsStylesSource, Math.max(0, settingsStylesSource.indexOf(".custom-option.is-active"))),
    message: "the active global-model option must remain visible in every theme without relying on DOM focus",
    match: "editable global-model active-option style contract",
  });
}
const focusThemeNames = ["mint", "blue", "purple", "mn"];
const focusContrastSurfaces = ["--bg", "--surface", "--track"];
const focusThemeValues = {};
for (const themeName of focusThemeNames) {
  const presetMatch = new RegExp(`\\n\\s*${themeName}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`).exec(appSource);
  const presetBody = presetMatch?.[1] || "";
  const themeValues = {};
  for (const variableName of ["--focus-ring", ...focusContrastSurfaces]) {
    themeValues[variableName] = new RegExp(
      `["']${variableName}["']\\s*:\\s*["'](#[0-9a-fA-F]{6})["']`,
    ).exec(presetBody)?.[1] || "";
  }
  focusThemeValues[themeName] = themeValues;

  const contrastFailure = focusContrastSurfaces.find((variableName) => (
    !themeValues["--focus-ring"]
      || !themeValues[variableName]
      || contrastRatio(themeValues["--focus-ring"], themeValues[variableName]) < 3
  ));
  const settingsThemeMatch = new RegExp(
    `\\.settings-panel\\[data-rs-theme=["']${themeName}["']\\]\\s*\\{([^}]*)\\}`,
  ).exec(settingsStylesSource);
  const settingsFocusRing = /--focus-ring:\s*(#[0-9a-fA-F]{6});/.exec(settingsThemeMatch?.[1] || "")?.[1] || "";
  if (!presetMatch || contrastFailure || settingsFocusRing !== themeValues["--focus-ring"]) {
    failures.push({
      file: appFile,
      line: lineNumberAt(appSource, Math.max(0, presetMatch?.index || 0)),
      message: "each Web theme must define one matching focus ring with at least 3:1 contrast against its main surfaces",
      match: `${themeName} focus theme contract`,
    });
  }
}

const rootThemeStyle = settingsStylesSource.match(/:root\s*\{([^}]*)\}/)?.[1] || "";
const rootFocusRing = /--focus-ring:\s*(#[0-9a-fA-F]{6});/.exec(rootThemeStyle)?.[1] || "";
const globalFocusRule = settingsStylesSource.match(
  /body\s+:where\(button,\s*a\[href\],\s*input,\s*textarea,\s*select,\s*summary,\s*\[tabindex\]:not\(\[tabindex=["']-1["']\]\)\):focus-visible\s*\{([^}]*)\}/,
);
const globalFocusRuleBody = globalFocusRule?.[1] || "";
const clippedFocusRule = settingsStylesSource.match(
  /:is\(\s*([\s\S]*?)\s*\)\s+:focus-visible\s*\{([^}]*)\}/,
);
const clippedFocusContainers = [
  ".conversation-tabs",
  ".quick-prompts",
  ".model-options",
  ".message-card-options",
  ".settings-tabs",
  ".custom-select-options",
  ".global-model-options",
];
if (rootFocusRing !== focusThemeValues.mint?.["--focus-ring"]
  || !/outline:\s*2px\s+solid\s+var\(--focus-ring\);/.test(globalFocusRuleBody)
  || !/outline-offset:\s*2px;/.test(globalFocusRuleBody)
  || !clippedFocusRule
  || clippedFocusContainers.some((selector) => !clippedFocusRule[1].includes(selector))
  || !/outline-offset:\s*-2px;/.test(clippedFocusRule?.[2] || "")) {
  failures.push({
    file: settingsStylesFile,
    line: lineNumberAt(settingsStylesSource, Math.max(0, settingsStylesSource.indexOf("body :where(button"))),
    message: "Web keyboard focus must cover native controls, links, and tabindex targets while keeping scroll-container rings inset",
    match: "global focus-visible style contract",
  });
}
const collapsedAnswerButtonStyle = settingsStylesSource.match(
  /\.message-actions\s+\.message-collapse-toggle\[aria-expanded=["']false["']\]\s*\{([^}]*)\}/,
)?.[1] || "";
if (!/\.message-answer-content\[hidden\]\s*\{[^}]*display:\s*none;[^}]*\}/.test(settingsStylesSource)
  || !/\.message-collapsed-placeholder\s*\{[^}]*text-align:\s*center;[^}]*\}/.test(settingsStylesSource)
  || !/color:\s*var\(--accent\);/.test(collapsedAnswerButtonStyle)
  || !/background:\s*var\(--track\);/.test(collapsedAnswerButtonStyle)
  || !/\.message-actions\s+\.message-collapse-toggle:focus-visible\s*\{[^}]*outline:\s*2px\s+solid\s+var\(--focus-ring\);[^}]*\}/.test(settingsStylesSource)) {
  failures.push({
    file: settingsStylesFile,
    line: lineNumberAt(settingsStylesSource, settingsStylesSource.indexOf(".message-answer-content")),
    message: "collapsed AI answers must be non-interactive and keep a theme-aware keyboard control",
    match: "AI long-answer collapse style contract",
  });
}
if (!/\.chat-status-shell\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;[^}]*min-width:\s*0;[^}]*\}/.test(settingsStylesSource)
  || !/\.chat-status\.is-expanded\s*\{[^}]*overflow-wrap:\s*anywhere;[^}]*white-space:\s*pre-wrap;[^}]*\}/.test(settingsStylesSource)
  || !/\.chat-status-toggle\s*\{[^}]*color:\s*var\(--accent\);[^}]*background:\s*transparent;[^}]*\}/.test(settingsStylesSource)
  || !/\.chat-status-toggle:focus-visible\s*\{[^}]*outline:\s*2px\s+solid\s+var\(--focus-ring\);[^}]*\}/.test(settingsStylesSource)) {
  failures.push({
    file: settingsStylesFile,
    line: lineNumberAt(settingsStylesSource, settingsStylesSource.indexOf(".chat-status-shell")),
    message: "expanded AI chat status must wrap in layout and keep a theme-aware visible keyboard control",
    match: "AI chat status details style contract",
  });
}
if (!/\.resizable-textarea-handle\s*\{[\s\S]*?touch-action:\s*none;[\s\S]*?\}/.test(settingsStylesSource)
  || !/\.resizable-textarea-top\s+\.resizable-textarea-handle/.test(settingsStylesSource)
  || !/\.resizable-textarea-bottom\s+\.resizable-textarea-handle/.test(settingsStylesSource)) {
  failures.push({
    file: settingsStylesFile,
    line: lineNumberAt(settingsStylesSource, settingsStylesSource.indexOf(".resizable-textarea-handle")),
    message: "shared resize handles must support both edges and suppress native touch gestures",
    match: "resizable textarea style contract",
  });
}
const chatLatestButtonStyle = settingsStylesSource.match(/\.chat-scroll-latest\s*\{([^}]*)\}/)?.[1] || "";
if (/chat-scroll-latest-bar/.test(appSource) || /\.chat-scroll-latest-bar\s*\{/.test(settingsStylesSource)
  || !/position:\s*absolute;/.test(chatLatestButtonStyle)
  || !/color:\s*var\(--text\);/.test(chatLatestButtonStyle)
  || !/background:\s*var\(--surface\);/.test(chatLatestButtonStyle)
  || !/min-height:\s*40px;/.test(chatLatestButtonStyle)) {
  failures.push({
    file: settingsStylesFile,
    line: lineNumberAt(settingsStylesSource, settingsStylesSource.indexOf(".chat-scroll-latest")),
    message: "AI chat latest-message control must remain readable and must not reserve a full-width content strip",
    match: "AI chat latest-message control style contract",
  });
}
const messageCardMenuStyle = settingsStylesSource.match(/\.message-card-menu\s*\{([^}]*)\}/)?.[1] || "";
const messageCardOptionsStyle = settingsStylesSource.match(/\.message-card-options\s*\{([^}]*)\}/)?.[1] || "";
const messageCardOptionButtonStyle = settingsStylesSource.match(
  /\.message-actions\s+\.message-card-options\s+button\s*\{([^}]*)\}/,
)?.[1] || "";
if (!/hidden=\{!cardMenuOpen\}/.test(messageCardOptionsMarkup)
  || !/position:\s*relative;/.test(messageCardMenuStyle)
  || !/position:\s*absolute;/.test(messageCardOptionsStyle)
  || !/left:\s*0;/.test(messageCardOptionsStyle)
  || !/bottom:\s*calc\(/.test(messageCardOptionsStyle)
  || !/border:[^;]*var\(--border\)/.test(messageCardOptionsStyle)
  || !/background:\s*var\(--surface\);/.test(messageCardOptionsStyle)
  || !/\.message-card-options\[hidden\]\s*\{[^}]*display:\s*none;[^}]*\}/.test(settingsStylesSource)
  || !/color:\s*var\(--text\);/.test(messageCardOptionButtonStyle)) {
  failures.push({
    file: settingsStylesFile,
    line: lineNumberAt(settingsStylesSource, settingsStylesSource.indexOf(".message-card-menu")),
    message: "AI message card menu must stay hideable, theme-aware, and anchored to its trigger",
    match: "AI message card menu style contract",
  });
}

if (failures.length > 0) {
  console.error("iPad performance guard failed:");
  for (const failure of failures) {
    console.error(`- ${failure.file}:${failure.line}: ${failure.message} (${JSON.stringify(failure.match)})`);
  }
  console.error("Fix the focus/zPosition red-line before building or installing.");
  process.exit(1);
}

console.log("iPad performance guard OK");
