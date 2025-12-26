const { extractText } = require("../../services/ocrService");
const { generateSummary } = require("../../services/summaryService");
const Summary = require("../models/Summary");

exports.generateAndSaveSummary = async (req, res) => {
  try {
    const { userId, fileId, fileUrl } = req.body;

    const text = await extractText({ fileUrl });
    const summary = await generateSummary(text);

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

    res.json({
      success: true,
      summary: saved.summary,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Summary generation failed",
    });
  }
};