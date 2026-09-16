const fs = require("fs");
const path = require("path");
const vm = require("vm");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const source = fs.readFileSync(path.join(__dirname, "..", "src", "RSMNExport.js"), "utf8");
const sandbox = {
  ReadingSpaceMN: {
    version: "0.1.0",
    settings: {
      readAISettings() {
        return {
          obsidianExport: {
            markdownFolder: "Research/MarginNote Imports",
          },
        };
      },
    },
    shortString(value, limit) {
      return String(value == null ? "" : value).slice(0, limit || 160);
    },
  },
  console,
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "RSMNExport.js" });

const exporter = sandbox.ReadingSpaceMN.mnExport;
assert(exporter && exporter.schema === "reading-space.mn-export.v1", "export schema must remain stable");

const base = {
  mnDocMd5: "doc-1",
  documentTitle: "Contract PDF",
  fileName: "Contract PDF.pdf",
  notebookId: "notebook-1",
  pageCount: 3,
  sourceKind: "mn-excerpt",
  sourceReason: "new-excerpt",
  textSource: "note.excerptText",
};

const single = exporter.buildPackageFromParts({
  ...base,
  mnNoteId: "note-1",
  text: "Contract excerpt",
  title: "Card title",
  comments: [{ id: "comment-1", type: "manual", content: "Card comment" }],
  color: "#ccfdc4",
  createdAt: "2026-07-10T01:00:00.000Z",
  updatedAt: "2026-07-10T02:00:00.000Z",
  parentMnNoteId: "parent-1",
  childMnNoteIds: ["child-1"],
  range: { startPage: 1, endPage: 1, startPos: { x: 10, y: 20 }, endPos: { x: 30, y: 20 } },
});

assert(single.excerpts[0].color === "#ccfdc4", "excerpt color must be exported");
assert(single.excerpts[0].createdAt === "2026-07-10T01:00:00.000Z", "excerpt createdAt must be exported");
assert(single.excerpts[0].updatedAt === "2026-07-10T02:00:00.000Z", "excerpt updatedAt must be exported");
assert(single.cards[0].title === "Card title", "card title must be exported");
assert(single.cards[0].comments[0].content === "Card comment", "card comments must be exported");
assert(single.cards[0].parentMnNoteId === "parent-1", "parent card id must be exported");
assert(single.cards[0].childMnNoteIds[0] === "child-1", "child card ids must be exported");
assert(single.destination && single.destination.markdownFolder === "Research/MarginNote Imports", "MN settings must provide the Obsidian Markdown folder");

const batch = exporter.buildPackageFromItems([
  {
    ...base,
    mnNoteId: "stale-note",
    text: "Stale range content",
    updatedAt: "2026-07-10T01:00:00.000Z",
    range: { startPage: 1, endPage: 1, startPos: { x: 10, y: 20 }, endPos: { x: 30, y: 20 } },
  },
  {
    ...base,
    mnNoteId: "latest-note",
    text: "Latest range content",
    updatedAt: "2026-07-10T03:00:00.000Z",
    range: { startPage: 1, endPage: 1, startPos: { x: 10, y: 20 }, endPos: { x: 30, y: 20 } },
  },
  {
    ...base,
    mnNoteId: "page-two-note",
    text: "Page two content",
    updatedAt: "2026-07-10T02:00:00.000Z",
    range: { startPage: 2, endPage: 2, startPos: { x: 10, y: 50 }, endPos: { x: 40, y: 50 } },
  },
]);

assert(batch.ok === true, "batch export must succeed");
assert(batch.package.excerpts.length === 2, "same physical range must be deduplicated inside one batch");
assert(batch.package.excerpts[0].mnNoteId === "latest-note", "newest note for a physical range must win");
assert(batch.package.excerpts[1].mnNoteId === "page-two-note", "batch excerpts must be ordered by page");
assert(batch.summary.duplicateCount === 1, "batch duplicate count must be reported");

const sameLineBatch = exporter.buildPackageFromItems([
  {
    ...base,
    mnNoteId: "same-line-right",
    text: "Same line right",
    range: { startPage: 1, endPage: 1, startPos: { x: 310, y: 584.4 }, endPos: { x: 370, y: 580 } },
  },
  {
    ...base,
    mnNoteId: "next-line",
    text: "Next line",
    range: { startPage: 1, endPage: 1, startPos: { x: 74, y: 560 }, endPos: { x: 560, y: 533 } },
  },
  {
    ...base,
    mnNoteId: "same-line-left",
    text: "Same line left",
    range: { startPage: 1, endPage: 1, startPos: { x: 76, y: 583.6 }, endPos: { x: 542, y: 577 } },
  },
]);
assert(
  sameLineBatch.package.excerpts.map(excerpt => excerpt.mnNoteId).join(",") === "same-line-left,same-line-right,next-line",
  "same-page excerpts must be ordered top-to-bottom and same-line left-to-right",
);

const studySetNotebook = {
  notebookId: "study-set-1",
  flags: 2,
  options: {},
  notes: [
    {
      noteId: "doc-note-1",
      notebookId: "study-set-1",
      docMd5: "doc-1",
      startPage: 1,
      endPage: 1,
      startPos: { x: 10, y: 20 },
      endPos: { x: 30, y: 20 },
      excerptText: "Study set excerpt",
      noteTitle: "Study set card",
      colorIndex: 1,
      createDate: "2026-07-10T01:00:00.000Z",
      modifiedDate: "2026-07-10T02:00:00.000Z",
      comments: [{ id: "study-comment", text: "Study comment" }],
      childNotes: [],
    },
    {
      noteId: "title-only-note",
      notebookId: "study-set-1",
      docMd5: "doc-1",
      startPage: 1,
      endPage: 1,
      startPos: { x: 40, y: 30 },
      endPos: { x: 90, y: 30 },
      excerptText: "",
      noteTitle: "Title carries excerpt",
      colorIndex: 2,
      createDate: "2026-07-10T01:00:00.000Z",
      modifiedDate: "2026-07-10T02:00:00.000Z",
      comments: [],
      childNotes: [],
    },
    {
      noteId: "same-title-note",
      notebookId: "study-set-1",
      docMd5: "doc-1",
      startPage: 1,
      endPage: 1,
      startPos: { x: 40, y: 40 },
      endPos: { x: 90, y: 40 },
      excerptText: "Same title and excerpt",
      noteTitle: "Same title and excerpt",
      colorIndex: 3,
      createDate: "2026-07-10T01:00:00.000Z",
      modifiedDate: "2026-07-10T02:00:00.000Z",
      comments: [],
      childNotes: [],
    },
    {
      noteId: "document-title-note",
      notebookId: "study-set-1",
      docMd5: "doc-1",
      excerptText: "",
      noteTitle: "Contract PDF",
      comments: [],
      childNotes: [],
    },
    {
      noteId: "other-doc-note",
      notebookId: "study-set-1",
      docMd5: "doc-2",
      startPage: 1,
      excerptText: "Other document excerpt",
      childNotes: [],
    },
  ],
};
const currentDocument = {
  docMd5: "doc-1",
  notebookId: "study-set-1",
  document: {
    docMd5: "doc-1",
    docTitle: "Contract PDF",
    fullPathFileName: "/tmp/Contract PDF.pdf",
    pageCount: 3,
  },
};
const studyController = {
  readerController: { currentDocumentController: currentDocument },
  notebookController: { notebookId: "study-set-1" },
};
sandbox.Application = {
  sharedInstance() {
    return {
      focusWindow: {},
      studyController() {
        return studyController;
      },
    };
  },
};
sandbox.Database = {
  sharedInstance() {
    return {
      getNotebookById(id) {
        return id === "study-set-1" ? studySetNotebook : null;
      },
      getDocumentById(id) {
        return id === "doc-1" ? currentDocument.document : null;
      },
    };
  },
};
sandbox.ReadingSpaceMN.probe = {
  records: [],
  record(event, detail) {
    this.records.push({ event, detail });
  },
};
sandbox.ReadingSpaceMN.view = { showHUD() {} };
sandbox.ReadingSpaceMN.excerpt = {
  current() {
    return {
      text: "",
      noteId: "title-only-current-note",
      note: {
        noteId: "title-only-current-note",
        notebookId: "study-set-1",
        docMd5: "doc-1",
        startPage: 2,
        endPage: 2,
        startPos: { x: 10, y: 60 },
        endPos: { x: 80, y: 60 },
        excerptText: "",
        noteTitle: "Current title carries excerpt",
        comments: [],
        childNotes: [],
      },
      source: "note",
      reason: "note",
    };
  },
};
studySetNotebook.notes.push({
  noteId: "current-context-note",
  notebookId: "study-set-1",
  docMd5: "doc-1",
  startPage: 2,
  endPage: 2,
  startPos: { x: 1, y: 60 },
  endPos: { x: 120, y: 60 },
  excerptText: "Prefix Current title carries excerpt suffix",
  childNotes: [],
});
const currentExport = exporter.buildCurrentExport({ window: {} });
assert(currentExport.ok === true, "current title-only excerpt export must succeed");
assert(currentExport.package.excerpts[0].text === "Current title carries excerpt", "current title-only mode must export title as excerpt text");
assert(currentExport.package.excerpts[0].textSource === "note.title", "current title-only mode must record note.title source");
assert(currentExport.package.cards[0].title === "", "current title-only excerpt must not duplicate text as card title");
assert(currentExport.package.excerpts[0].context.prefix === "Prefix ", "single export must infer context prefix from a same-page containing excerpt");
assert(currentExport.package.excerpts[0].context.suffix === " suffix", "single export must infer context suffix from a same-page containing excerpt");
studySetNotebook.notes.pop();

const documentExport = exporter.buildCurrentDocumentExport({ window: {} });
assert(documentExport.ok === true, "current study set document export must succeed");
assert(documentExport.summary.mode === "document", "document export summary mode must be document");
assert(documentExport.summary.exportCount === 3, "document export must include all current PDF excerpt modes");
const exportedById = Object.fromEntries(documentExport.package.excerpts.map((excerpt, index) => [
  excerpt.mnNoteId,
  { excerpt, card: documentExport.package.cards[index] },
]));
assert(exportedById["doc-note-1"].card.title === "Study set card", "different content and title must keep the card title");
assert(exportedById["doc-note-1"].card.comments[0].content === "Study comment", "document export must keep card comments");
assert(exportedById["title-only-note"].excerpt.text === "Title carries excerpt", "title-only mode must export title as excerpt text");
assert(exportedById["title-only-note"].excerpt.textSource === "note.title", "title-only mode must record note.title source");
assert(exportedById["title-only-note"].card.title === "", "title-only excerpt must not duplicate text as card title");
assert(exportedById["same-title-note"].excerpt.textSource === "note.excerptText", "content mode must prefer excerptText");
assert(exportedById["same-title-note"].card.title === "", "same title and excerpt must not duplicate card title");
assert(documentExport.summary.titleExcerpts === 1, "document summary must count title-backed excerpts");
assert(documentExport.summary.cardTitles === 1, "document summary must count only independent card titles");
assert(
  sandbox.ReadingSpaceMN.probe.records.some(record => (
    record.event === "MNExport:documentScanned" &&
    record.detail.route === "study-set-current" &&
    record.detail.unlocatedTitleNotesSkipped === 1
  )),
  "flags=2 current study set route and skipped document title must be recorded",
);

console.log("MN export contract: OK");
