const fs = require("fs");
const { execFileSync } = require("child_process");

const DEFAULTS_DOMAIN = "QReader.MarginStudy.easy";
const PROBE_KEY = "readingspace_mn_probe_log";

function readArg(name, fallback) {
  const prefix = `${name}=`;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return fallback;
}

function hasFlag(name) {
  return process.argv.slice(2).includes(name);
}

function readProbeLog() {
  const file = readArg("--file", "");
  if (file) return fs.readFileSync(file, "utf8");
  const exported = execFileSync("defaults", ["export", DEFAULTS_DOMAIN, "-"], { encoding: "utf8" });
  return execFileSync("plutil", ["-extract", PROBE_KEY, "raw", "-o", "-", "-"], {
    input: exported,
    encoding: "utf8",
  });
}

function parseJson(raw) {
  try {
    const value = JSON.parse(raw || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    throw new Error(`Cannot parse probe log JSON: ${error.message}`);
  }
}

function byCount(items, keyFn) {
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

function summarizeByNote(events) {
  const notes = new Map();
  for (const event of events) {
    const detail = event.detail || {};
    const noteId = String(detail.noteId || "");
    const key = noteId || "(missing noteId)";
    const previous = notes.get(key);
    notes.set(key, {
      noteId: key,
      count: previous ? previous.count + 1 : 1,
      latestIndex: event.index,
      latestAt: event.at,
      route: detail.route || "",
      routeReason: detail.routeReason || "",
      textLength: Number(detail.textLength || 0),
      textSource: detail.textSource || "",
      textSignature: detail.textSignature || "",
      ignoredTextSource: detail.ignoredTextSource || "",
      ignoredTextLength: Number(detail.ignoredTextLength || 0),
      ignoredTextSignature: detail.ignoredTextSignature || "",
      senderUserInfoKeys: detail.senderUserInfoKeys || "",
      senderSelectionTextLength: Number(detail.senderSelectionTextLength || 0),
      senderSelectionTextSource: detail.senderSelectionTextSource || "",
      senderNoteKeys: detail.senderNoteKeys || "",
      senderNestedNoteKeys: detail.senderNestedNoteKeys || "",
      senderNoteTextLength: Number(detail.senderNoteTextLength || 0),
      senderNoteTextSource: detail.senderNoteTextSource || "",
      senderNoteTextSignature: detail.senderNoteTextSignature || "",
      cardContentSource: detail.cardContentSource || "",
      cardContentLength: Number(detail.cardContentLength || 0),
      cardContentSignature: detail.cardContentSignature || "",
      officialCompatibleCardContent: detail.officialCompatibleCardContent,
      selectedMindmapNoteMatch: detail.selectedMindmapNoteMatch,
      mindmapHitReason: detail.mindmapHitReason || "",
      mindmapHitSelectedCount: Number(detail.mindmapHitSelectedCount || 0),
      mindmapHitNoteIdMatched: detail.mindmapHitNoteIdMatched,
      mindmapHitRawFrameOverlap: Number(detail.mindmapHitRawFrameOverlap || 0),
      mindmapHitConvertedFrameOverlap: Number(detail.mindmapHitConvertedFrameOverlap || 0),
      documentFocusMatched: detail.documentFocusMatched,
      documentFocusTextLength: Number(detail.documentFocusTextLength || 0),
      sqliteTextLength: Number(detail.sqliteTextLength || 0),
      sqliteTextSource: detail.sqliteTextSource || "",
      sqlitePathFound: detail.sqlitePathFound,
      sqliteError: detail.sqliteError || "",
      sqliteQueryMethod: detail.sqliteQueryMethod || "",
      pdfCacheTextLength: Number(detail.pdfCacheTextLength || 0),
      pdfCopyProbePending: detail.pdfCopyProbePending,
      pdfCopyCanRun: detail.pdfCopyCanRun,
      pdfCopyError: detail.pdfCopyError || "",
      pdfTextRangeProbe: detail.pdfTextRangeProbe,
    });
  }
  return Array.from(notes.values()).sort((a, b) => Number(b.latestIndex || 0) - Number(a.latestIndex || 0));
}

function compactTable(rows) {
  return rows.map((row) => ({
    noteId: row.noteId,
    count: row.count,
    latestIndex: row.latestIndex,
    routeReason: row.routeReason,
    textLength: row.textLength,
    textSource: row.textSource,
    textSignature: row.textSignature,
    ignoredTextSource: row.ignoredTextSource,
    ignoredTextLength: row.ignoredTextLength,
    ignoredTextSignature: row.ignoredTextSignature,
    senderUserInfoKeys: row.senderUserInfoKeys,
    senderSelectionTextLength: row.senderSelectionTextLength,
    senderSelectionTextSource: row.senderSelectionTextSource,
    senderNoteKeys: row.senderNoteKeys,
    senderNestedNoteKeys: row.senderNestedNoteKeys,
    senderNoteTextLength: row.senderNoteTextLength,
    senderNoteTextSource: row.senderNoteTextSource,
    senderNoteTextSignature: row.senderNoteTextSignature,
    cardContentSource: row.cardContentSource,
    cardContentLength: row.cardContentLength,
    cardContentSignature: row.cardContentSignature,
    officialCompatibleCardContent: row.officialCompatibleCardContent,
    documentFocusMatched: row.documentFocusMatched,
    mindmapHitReason: row.mindmapHitReason,
    mindmapHitSelectedCount: row.mindmapHitSelectedCount,
    mindmapHitNoteIdMatched: row.mindmapHitNoteIdMatched,
    mindmapHitRawFrameOverlap: row.mindmapHitRawFrameOverlap,
    mindmapHitConvertedFrameOverlap: row.mindmapHitConvertedFrameOverlap,
    documentFocusTextLength: row.documentFocusTextLength,
    sqliteTextLength: row.sqliteTextLength,
    sqliteTextSource: row.sqliteTextSource,
    sqlitePathFound: row.sqlitePathFound,
    sqliteError: row.sqliteError,
    sqliteQueryMethod: row.sqliteQueryMethod,
    pdfCacheTextLength: row.pdfCacheTextLength,
    pdfCopyProbePending: row.pdfCopyProbePending,
    pdfCopyCanRun: row.pdfCopyCanRun,
    pdfCopyError: row.pdfCopyError,
    pdfTextRangeProbe: row.pdfTextRangeProbe,
  }));
}

function main() {
  const limit = Math.max(0, Number(readArg("--limit", "0")) || 0);
  const sinceIndex = Math.max(0, Number(readArg("--since-index", "0")) || 0);
  const allEvents = parseJson(readProbeLog());
  const windowed = limit > 0 ? allEvents.slice(-limit) : allEvents;
  const events = windowed.filter((event) => Number(event.index || 0) > sinceIndex);
  const routeDecisions = events.filter((event) => event.event === "CardTapRoute:decision");
  const withoutLiveSelectionText = routeDecisions.filter((event) => {
    const detail = event.detail || {};
    return detail.route === "pdf-selection-toolbar" && detail.routeReason === "small-popup-target-without-live-selection-text";
  });
  const senderNoteQHTextSuccesses = routeDecisions.filter((event) => {
    const detail = event.detail || {};
    return detail.route === "pdf-selection-toolbar" && detail.routeReason === "small-popup-target-with-sender-note-q-htext";
  });
  const noteCardContentRoutes = routeDecisions.filter((event) => {
    const detail = event.detail || {};
    return detail.route === "pdf-selection-toolbar" && detail.routeReason === "small-popup-target-with-note-card-content";
  });
  const popupPDFExcerptUnsafeRoutes = routeDecisions.filter((event) => {
    const detail = event.detail || {};
    return detail.route === "pdf-selection-toolbar" && detail.routeReason === "small-popup-target-with-popup-pdf-note-excerpt";
  });
  const rangePendingRoutes = routeDecisions.filter((event) => {
    const detail = event.detail || {};
    return detail.route === "pdf-selection-toolbar" && detail.routeReason === "small-popup-target-with-pdf-range-selection-pending";
  });
  const rangeSelectionTextSuccesses = routeDecisions.filter((event) => {
    const detail = event.detail || {};
    return detail.route === "pdf-selection-toolbar" && detail.routeReason === "small-popup-target-with-pdf-range-selection-text";
  });
  const rangeProbeResults = events.filter((event) => event.event === "PDFRangeSelectionProbe:afterSetSelection");
  const rangeProbeSuccesses = rangeProbeResults.filter((event) => (event.detail || {}).ok === true);
  const rangeSelectionSkips = events.filter((event) => event.event === "PDFRangeSelectionProbe:skipped");
  const copyProbeQueries = events.filter((event) => event.event === "PDFCopyCommandProbe:query");
  const copyProbeResults = events.filter((event) => event.event === "PDFCopyCommandProbe:result");
  const copyProbeSuccesses = copyProbeResults.filter((event) => (event.detail || {}).ok === true);
  const copyProbeAccepted = events.filter((event) => event.event === "PDFCopyCommandProbe:accepted");
  const textRangeProbes = events.filter((event) => event.event === "PDFTextRangeProbe:result");
  const textRangeSuccesses = textRangeProbes.filter((event) => (event.detail || {}).ok === true);
  const unsafeTextRouteDecisions = routeDecisions.filter((event) => {
    const detail = event.detail || {};
    return detail.route === "pdf-selection-toolbar" && (
      String(detail.routeReason || "") === "small-popup-target-with-sqlite-note-text" ||
      String(detail.routeReason || "") === "small-popup-target-with-cached-excerpt-text" ||
      String(detail.routeReason || "") === "small-popup-target-with-document-focus-note-text" ||
      String(detail.routeReason || "") === "small-popup-target-with-sender-note-excerpt-text" ||
      String(detail.routeReason || "") === "small-popup-target-with-excerpt-text-treated-as-document" ||
      String(detail.routeReason || "") === "small-popup-target-with-popup-pdf-note-excerpt" ||
      String(detail.textSource || "").indexOf("sqlite.ZBOOKNOTE.") === 0 ||
      String(detail.textSource || "").indexOf("pdf-excerpt-cache:") === 0 ||
      String(detail.textSource || "").indexOf("documentFocus.") === 0 ||
      String(detail.textSource || "") === "popup.pdf-note-excerpt" ||
      String(detail.textSource || "") === "sender.userInfo.note.excerptText" ||
      String(detail.textSource || "") === "sender.userInfo.note.note.excerptText" ||
      String(detail.textSource || "") === "sender.userInfo.note.mainExcerptText" ||
      String(detail.textSource || "") === "sender.userInfo.note.note.mainExcerptText" ||
      String(detail.textSource || "") === "note-excerpt" ||
      String(detail.textSource || "") === "note.excerptText" ||
      String(detail.textSource || "") === "note.mainExcerptText" ||
      String(detail.textSource || "") === "note.allText" ||
      String(detail.textSource || "") === "note.allNoteText" ||
      String(detail.textSource || "") === "note.aggregate"
    );
  });
  const suspiciousMissingLiveText = withoutLiveSelectionText.filter((event) => Number(event.detail && event.detail.ignoredTextLength || 0) > 0);

  const summary = {
    totalEvents: allEvents.length,
    inspectedEvents: events.length,
    routeDecisionCount: routeDecisions.length,
    routeReasons: byCount(routeDecisions, (event) => `${event.detail && event.detail.route || ""}:${event.detail && event.detail.routeReason || ""}`),
    senderNoteQHTextSuccesses: compactTable(summarizeByNote(senderNoteQHTextSuccesses)),
    noteCardContentRoutes: compactTable(summarizeByNote(noteCardContentRoutes)),
    popupPDFExcerptUnsafeRoutes: compactTable(summarizeByNote(popupPDFExcerptUnsafeRoutes)),
    rangePendingRoutes: compactTable(summarizeByNote(rangePendingRoutes)),
    rangeSelectionTextSuccesses: compactTable(summarizeByNote(rangeSelectionTextSuccesses)),
    rangeProbeCount: rangeProbeResults.length,
    rangeProbeSuccessCount: rangeProbeSuccesses.length,
    rangeSelectionSkipCount: rangeSelectionSkips.length,
    rangeSelectionSkipLatest: rangeSelectionSkips.slice(-8).map((event) => ({
      index: event.index,
      noteId: event.detail && event.detail.noteId || "",
      reason: event.detail && event.detail.reason || "",
      policy: event.detail && event.detail.policy || "",
    })),
    copyProbeQueryCount: copyProbeQueries.length,
    copyProbeResultCount: copyProbeResults.length,
    copyProbeSuccessCount: copyProbeSuccesses.length,
    copyProbeAcceptedCount: copyProbeAccepted.length,
    textRangeProbeCount: textRangeProbes.length,
    textRangeSuccessCount: textRangeSuccesses.length,
    textRangeLatest: textRangeProbes.slice(-8).map((event) => {
      const detail = event.detail || {};
      return {
        index: event.index,
        noteId: detail.noteId || "",
        ok: detail.ok === true,
        docFound: detail.docFound,
        lineCount: Number(detail.lineCount || 0),
        startLine: Number(detail.startLine || -1),
        endLine: Number(detail.endLine || -1),
        textLength: Number(detail.textLength || 0),
        textSignature: detail.textSignature || "",
        preview: detail.preview || "",
        error: detail.error || "",
      };
    }),
    copyProbeLatest: copyProbeResults.slice(-8).map((event) => {
      const detail = event.detail || {};
      return {
        index: event.index,
        noteId: detail.noteId || "",
        ok: detail.ok === true,
        textLength: Number(detail.textLength || 0),
        textSignature: detail.textSignature || "",
        changedFromOriginal: detail.changedFromOriginal,
        changeCountChanged: detail.changeCountChanged,
        restored: detail.restored,
        pasteboardError: detail.pasteboardError || "",
      };
    }),
    withoutLiveSelectionText: compactTable(summarizeByNote(withoutLiveSelectionText)),
    unsafeTextRouteDecisions: compactTable(summarizeByNote(unsafeTextRouteDecisions)),
    suspiciousMissingLiveText: compactTable(summarizeByNote(suspiciousMissingLiveText)),
  };

  if (hasFlag("--json")) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log("Selection toolbar probe diagnosis");
    console.log(`events: ${summary.inspectedEvents}/${summary.totalEvents}`);
    console.log(`route decisions: ${summary.routeDecisionCount}`);
    console.log("route reasons:");
    if (summary.routeReasons.length) {
      for (const [name, count] of summary.routeReasons) console.log(`  ${count} ${name}`);
    } else {
      console.log("  none in inspected log window");
    }
    console.log(`PDF toolbars without live selection text: ${summary.withoutLiveSelectionText.length}`);
    for (const row of summary.withoutLiveSelectionText) {
      console.log(`  ${row.noteId} count=${row.count} latest=${row.latestIndex} ignored=${row.ignoredTextLength}:${row.ignoredTextSource} sender=${row.senderSelectionTextLength}:${row.senderSelectionTextSource} senderNote=${row.senderNoteTextLength}:${row.senderNoteTextSource}`);
    }
    console.log(`sender note q_htext successes: ${summary.senderNoteQHTextSuccesses.length}`);
    for (const row of summary.senderNoteQHTextSuccesses) {
      console.log(`  ${row.noteId} count=${row.count} latest=${row.latestIndex} textLength=${row.textLength} source=${row.textSource}`);
    }
    console.log(`note card content routes: ${summary.noteCardContentRoutes.length}`);
    for (const row of summary.noteCardContentRoutes) {
      console.log(`  ${row.noteId} count=${row.count} latest=${row.latestIndex} textLength=${row.textLength} source=${row.textSource} cardSource=${row.cardContentSource}`);
    }
    console.log(`popup PDF excerpt unsafe routes: ${summary.popupPDFExcerptUnsafeRoutes.length}`);
    for (const row of summary.popupPDFExcerptUnsafeRoutes) {
      console.log(`  ${row.noteId} count=${row.count} latest=${row.latestIndex} textLength=${row.textLength} source=${row.textSource}`);
    }
    console.log(`PDF range pending routes: ${summary.rangePendingRoutes.length}`);
    for (const row of summary.rangePendingRoutes) {
      console.log(`  ${row.noteId} count=${row.count} latest=${row.latestIndex} ignored=${row.ignoredTextLength}:${row.ignoredTextSource}`);
    }
    console.log(`PDF range text successes: ${summary.rangeSelectionTextSuccesses.length}`);
    for (const row of summary.rangeSelectionTextSuccesses) {
      console.log(`  ${row.noteId} count=${row.count} latest=${row.latestIndex} textLength=${row.textLength} source=${row.textSource}`);
    }
    console.log(`PDF range probe successes: ${summary.rangeProbeSuccessCount}/${summary.rangeProbeCount}`);
    console.log(`PDF range UI-state restores skipped: ${summary.rangeSelectionSkipCount}`);
    for (const row of summary.rangeSelectionSkipLatest) {
      console.log(`  skipped latest=${row.index} note=${row.noteId} reason=${row.reason} policy=${row.policy}`);
    }
    console.log(`PDF copy command probe successes: ${summary.copyProbeSuccessCount}/${summary.copyProbeResultCount} accepted=${summary.copyProbeAcceptedCount} queries=${summary.copyProbeQueryCount}`);
    for (const row of summary.copyProbeLatest) {
      console.log(`  copy latest=${row.index} note=${row.noteId} ok=${row.ok} len=${row.textLength} sig=${row.textSignature} changed=${row.changedFromOriginal} countChanged=${row.changeCountChanged} restored=${row.restored} err=${row.pasteboardError}`);
    }
    console.log(`PDF text range probe successes: ${summary.textRangeSuccessCount}/${summary.textRangeProbeCount}`);
    for (const row of summary.textRangeLatest) {
      console.log(`  textRange latest=${row.index} note=${row.noteId} ok=${row.ok} doc=${row.docFound} lines=${row.lineCount} range=${row.startLine}-${row.endLine} len=${row.textLength} sig=${row.textSignature} err=${row.error} preview=${row.preview}`);
    }
    console.log(`unsafe text route decisions: ${summary.unsafeTextRouteDecisions.length}`);
    for (const row of summary.unsafeTextRouteDecisions) {
      console.log(`  ${row.noteId} count=${row.count} latest=${row.latestIndex} textLength=${row.textLength} source=${row.textSource}`);
    }
    if (summary.suspiciousMissingLiveText.length) {
      console.log(`missing live text routes with ignored note text: ${summary.suspiciousMissingLiveText.length}`);
    }
  }

  if (summary.unsafeTextRouteDecisions.length > 0) process.exitCode = 2;
}

main();
