const axios = require("axios");

// Split text into chunks of approx maxLen with optional overlap
function chunkText(text, maxLen = 3000, overlap = 200) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxLen, text.length);
    if (end < text.length) {
      // try to break at last whitespace to avoid cutting words
      const lastSpace = text.lastIndexOf(" ", end);
      if (lastSpace > start) end = lastSpace;
      // ensure some progress
      if (end <= start) end = Math.min(start + maxLen, text.length);
    }
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start = end - overlap; // overlap for context
    if (start < 0) start = 0;
  }
  return chunks;
}

async function callSummarizer(text, timeoutMs = 120000, retries = 1) {
  const url = "http://127.0.0.1:7100/summarize";
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(
        `🔗 [SUMMARY SERVICE] POST ${url} length:${text.length} timeout:${timeoutMs} attempt:${attempt}`
      );
      const res = await axios.post(url, { text }, { timeout: timeoutMs });
      if (!res.data || !res.data.success) {
        console.error("❌ [SUMMARY SERVICE] Upstream error", res.data);
        throw new Error("Upstream summarizer error");
      }
      return res.data.summary;
    } catch (err) {
      const isTimeout = err.code === "ECONNABORTED";
      console.error(
        `❌ [SUMMARY SERVICE] attempt ${attempt} failed:`,
        err.message || err.toString()
      );
      if (attempt === retries) throw err;
      // backoff before retry
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      // continue to next attempt
    }
  }
}

exports.generateSummary = async (text) => {
  try {
    const len = text?.length || 0;
    console.log("🔗 [SUMMARY SERVICE] generateSummary called, length:", len);

    if (len === 0) return "";
    if (len < 200) {
      console.log(
        "🔗 [SUMMARY SERVICE] Text too short to summarize, returning original text"
      );
      return text;
    }

    // If text is large, chunk and summarize each chunk, then combine
    const MAX_CHUNK = 1500;
    const OVERLAP = 100;
    const chunks = chunkText(text, MAX_CHUNK, OVERLAP);

    // If only one chunk, call summarizer directly with a generous timeout
    if (chunks.length === 1) {
      return await callSummarizer(chunks[0], 180000, 1);
    }

    // Summarize each chunk with a smaller timeout
    const chunkSummaries = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(
        `🔗 [SUMMARY SERVICE] Summarizing chunk ${i + 1}/${
          chunks.length
        } (len:${chunks[i].length})`
      );
      // shorter timeout per chunk
      const s = await callSummarizer(chunks[i], 60000, 1);
      chunkSummaries.push(s);
    }

    // Hierarchically condense chunk summaries until final payload is small
    let combined = chunkSummaries.join("\n\n");
    console.log(
      "🔗 [SUMMARY SERVICE] Initial combined summaries length:",
      combined.length
    );
    const MAX_FINAL = 3000;
    let level = 0;
    while (combined.length > MAX_FINAL && level < 4) {
      const levelChunks = chunkText(combined, MAX_CHUNK, OVERLAP);
      const levelSummaries = [];
      for (let i = 0; i < levelChunks.length; i++) {
        console.log(
          `🔗 [SUMMARY SERVICE] Condensing level ${level + 1} part ${i + 1}/${
            levelChunks.length
          } (len:${levelChunks[i].length})`
        );
        const s = await callSummarizer(levelChunks[i], 90000, 1);
        levelSummaries.push(s);
      }
      combined = levelSummaries.join("\n\n");
      console.log(
        `🔗 [SUMMARY SERVICE] After level ${level + 1} combined length:`,
        combined.length
      );
      level += 1;
    }

    // Final condensation pass with moderate timeout
    const final = await callSummarizer(combined, 120000, 1);
    return final;
  } catch (err) {
    console.error(
      "❌ [SUMMARY SERVICE] Error in generateSummary:",
      err.message || err
    );
    throw err;
  }
};
