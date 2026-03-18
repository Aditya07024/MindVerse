const { extractText } = require("../../services/ocrService");
const { generateSummary } = require("../../services/summaryService");
const Summary = require("../models/Summary");
const { File } = require("../models");

// Generate summary (will attempt to read fileUrl/userId from body,
// or fallback to lookup the File record by fileId)
exports.generateAndSaveSummary = async (req, res) => {
  try {
    console.log("📊 [SUMMARY] generateAndSaveSummary called with:", req.body);
    let { userId, fileId, fileUrl } = req.body;

    // If client requests synchronous behavior (for debugging), allow it
    const sync = req.query && req.query.sync === "true";

    if (!fileUrl || !userId) {
      // try to lookup file
      console.log("📊 [SUMMARY] Looking up file with fileId:", fileId);
      const fileDoc = await File.findById(fileId);
      if (!fileDoc) {
        console.log("❌ [SUMMARY] File not found:", fileId);
        return res
          .status(404)
          .json({ success: false, message: "File not found" });
      }
      fileUrl = fileUrl || fileDoc.fileUrl;
      userId = userId || fileDoc.userId;
      console.log("📊 [SUMMARY] Found file. URL:", fileUrl, "UserID:", userId);
    }

    if (sync) {
      // Run the existing synchronous flow (may be memory heavy)
      console.log("🔄 [SUMMARY] (sync) Starting OCR extraction...");
      const text = await extractText({ fileUrl });
      console.log(
        "✅ [SUMMARY] (sync) OCR extraction completed. Text length:",
        text.length
      );

      console.log("🔄 [SUMMARY] (sync) Starting summary generation...");
      const summary = await generateSummary(text);
      console.log(
        "✅ [SUMMARY] (sync) Summary generation completed. Summary length:",
        summary.length
      );

      const saved = await Summary.findOneAndUpdate(
        { fileId },
        {
          userId,
          fileId,
          text,
          summary,
        },
        { upsert: true, new: true }
      );

      console.log("💾 [SUMMARY] (sync) Saved to database:", saved._id);
      return res.json({ success: true, summary: saved.summary, text: saved.text });
    }

    // Otherwise fork a worker process to do the heavy lifting to avoid
    // blocking or exhausting the main server's memory.
    const { fork } = require("child_process");
    const workerPath = require("path").resolve(__dirname, "../../scripts/summaryWorker.js");
    // fork worker with increased heap to avoid OOM on large documents
    const worker = fork(workerPath, [], {
      execArgv: ["--max-old-space-size=4096"],
      stdio: ["inherit", "inherit", "inherit", "ipc"],
    });
    worker.send({ fileId, userId, fileUrl });
    worker.on("message", (m) => console.log("[controller] worker message:", m));
    worker.on("exit", (code) => console.log("[controller] worker exited with", code));

    console.log("🔔 [SUMMARY] Worker started for fileId:", fileId);
    return res.status(202).json({ success: true, message: "Summary generation started" });
  } catch (err) {
    console.error("❌ [SUMMARY] Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Summary generation failed" });
  }
};

// Extract OCR text only and save (upsert) — returns saved text
exports.extractTextOnly = async (req, res) => {
  try {
    console.log("🔍 [OCR] extractTextOnly called with:", req.body);
    const { userId, fileId, fileUrl } = req.body;

    let uid = userId;
    let fUrl = fileUrl;

    if (!fUrl || !uid) {
      console.log("🔍 [OCR] Looking up file with fileId:", fileId);
      const fileDoc = await File.findById(fileId);
      if (!fileDoc) {
        console.log("❌ [OCR] File not found:", fileId);
        return res
          .status(404)
          .json({ success: false, message: "File not found" });
      }
      fUrl = fUrl || fileDoc.fileUrl;
      uid = uid || fileDoc.userId;
      console.log("🔍 [OCR] Found file. URL:", fUrl, "UserID:", uid);
    }

    console.log("🔄 [OCR] Starting text extraction...");
    const text = await extractText({ fileUrl: fUrl });
    console.log(
      "✅ [OCR] Text extraction completed. Text length:",
      text.length
    );

    const saved = await Summary.findOneAndUpdate(
      { fileId },
      { userId: uid, fileId, text },
      { upsert: true, new: true }
    );

    console.log("💾 [OCR] Saved to database:", saved._id);
    res.json({ success: true, text: saved.text });
  } catch (err) {
    console.error("❌ [OCR] Error:", err);
    res.status(500).json({ success: false, message: "OCR extraction failed" });
  }
};

// Get summary/document by fileId
exports.getSummaryByFileId = async (req, res) => {
  try {
    const { fileId } = req.params;
    const doc = await Summary.findOne({ fileId });
    res.json({ success: true, data: doc || null });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch summary" });
  }
};
