const axios = require("axios");

const SHORT_TEXT_THRESHOLD = 400;
const CHUNK_SIZE = 5000;
const CHUNK_OVERLAP = 400;
const FINAL_SUMMARY_TARGET = 900;

function normalizeText(text) {
  return (text || "").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function splitIntoSentences(text) {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function chunkText(text, maxLen = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const cleaned = normalizeText(text);
  if (cleaned.length <= maxLen) {
    return cleaned ? [cleaned] : [];
  }

  const chunks = [];
  let start = 0;

  while (start < cleaned.length) {
    let end = Math.min(start + maxLen, cleaned.length);

    if (end < cleaned.length) {
      const lastBreak = Math.max(
        cleaned.lastIndexOf("\n\n", end),
        cleaned.lastIndexOf(". ", end),
        cleaned.lastIndexOf(" ", end)
      );

      if (lastBreak > start + Math.floor(maxLen * 0.6)) {
        end = lastBreak + 1;
      }
    }

    const chunk = cleaned.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= cleaned.length) {
      break;
    }

    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

function getSummaryInstructions(summaryType, mode) {
  const typeInstructions = {
    short: "Keep the summary brief and high signal. Use 2-3 overview sentences and 3-5 bullets.",
    detailed: "Keep enough detail for revision. Use an overview and 4-7 substantial bullets.",
    bullet: "Prefer bullets over paragraphs. Keep the output scannable and concise.",
    exam: "Optimize for exam preparation. Focus on definitions, formulas, key facts, contrasts, and likely testable points.",
  };

  if (mode === "combine") {
    return [
      "You are an expert academic summarizer.",
      "Combine partial summaries into one final study summary.",
      typeInstructions[summaryType] || typeInstructions.detailed,
      "Preserve important facts, definitions, formulas, steps, and conclusions.",
      "Remove repetition.",
      "Output plain text only.",
      "Format:",
      "Overview: 2-4 sentences.",
      "Key Points: 4-7 bullets.",
      "If relevant, include an 'Important Terms' section.",
    ].join(" ");
  }

  return [
    "You are an expert academic summarizer.",
    typeInstructions[summaryType] || typeInstructions.detailed,
    "Summarize study material accurately and compactly.",
    "Keep concrete facts, definitions, formulas, dates, named concepts, and procedural steps.",
    "Output plain text only.",
    "Format:",
    "Overview: 2-4 sentences.",
    "Key Points: 4-7 bullets.",
    "If relevant, include an 'Important Terms' section.",
  ].join(" ");
}

function buildUserPrompt(text, mode, summaryType) {
  if (mode === "combine") {
    return [
      `Merge these partial summaries into one final ${summaryType} study summary under ${FINAL_SUMMARY_TARGET} words.`,
      "Keep the most useful points for revision and remove overlap.",
      "",
      text,
    ].join("\n");
  }

  return [
    `Summarize this study material in ${summaryType} mode for revision.`,
    "Prioritize exam-relevant ideas, definitions, processes, and facts.",
    "",
    text,
  ].join("\n");
}

function fallbackSummary(text, summaryType = "detailed") {
  const sentences = splitIntoSentences(text);
  if (sentences.length <= 4) {
    return sentences.join(" ");
  }

  if (summaryType === "bullet") {
    return [
      "Key Points:",
      ...sentences.slice(0, 6).map((sentence) => `- ${sentence}`),
    ].join("\n");
  }

  const overview = sentences.slice(0, summaryType === "short" ? 2 : 3).join(" ");
  const bulletCount = summaryType === "short" ? 4 : 6;
  const keyPoints = sentences
    .slice(summaryType === "short" ? 2 : 3, summaryType === "short" ? 2 + bulletCount : 3 + bulletCount)
    .map((sentence) => `- ${sentence}`)
    .join("\n");

  return `Overview:\n${overview}\n\nKey Points:\n${keyPoints}`;
}

async function callAnthropic(prompt, mode, summaryType) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";
  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model,
      max_tokens: mode === "combine" ? 900 : 700,
      system: getSummaryInstructions(summaryType, mode),
      messages: [
        {
          role: "user",
          content: buildUserPrompt(prompt, mode, summaryType),
        },
      ],
    },
    {
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      timeout: 120000,
    }
  );

  const content = response.data?.content || [];
  return content
    .filter((item) => item?.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

async function callOpenRouter(prompt, mode, summaryType) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: getSummaryInstructions(summaryType, mode) },
        { role: "user", content: buildUserPrompt(prompt, mode, summaryType) },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 120000,
    }
  );

  return response.data?.choices?.[0]?.message?.content?.trim() || null;
}

function getProviderOrder() {
  const configured = (process.env.SUMMARY_PROVIDER || "").trim().toLowerCase();

  if (configured === "openrouter") return ["openrouter"];
  if (configured === "anthropic") return ["anthropic"];
  if (configured === "local") return ["local"];

  const providers = [];
  if (process.env.OPENROUTER_API_KEY) providers.push("openrouter");
  if (process.env.ANTHROPIC_API_KEY) providers.push("anthropic");
  providers.push("local");
  return providers;
}

async function runProvider(provider, text, mode, summaryType) {
  if (provider === "openrouter") {
    return callOpenRouter(text, mode, summaryType);
  }
  if (provider === "anthropic") {
    return callAnthropic(text, mode, summaryType);
  }
  return fallbackSummary(text, summaryType);
}

async function summarizeWithProviders(text, mode = "single", summaryType = "detailed") {
  const providers = getProviderOrder();

  for (const provider of providers) {
    try {
      const result = await runProvider(provider, text, mode, summaryType);
      if (result) return result;
    } catch (error) {
      console.error(
        `❌ [SUMMARY SERVICE] ${provider} failed, trying next provider:`,
        error.response?.data || error.message
      );
    }
  }

  return fallbackSummary(text, summaryType);
}

exports.generateSummary = async (text, options = {}) => {
  const cleaned = normalizeText(text);
  const summaryType = options.summaryType || "detailed";

  if (!cleaned) return "";
  if (cleaned.length < SHORT_TEXT_THRESHOLD) {
    return summarizeWithProviders(cleaned, "single", summaryType);
  }

  try {
    const chunks = chunkText(cleaned);

    if (chunks.length === 1) {
      return summarizeWithProviders(cleaned, "single", summaryType);
    }

    const partialSummaries = [];
    for (const chunk of chunks) {
      partialSummaries.push(await summarizeWithProviders(chunk, "single", summaryType));
    }

    const combined = partialSummaries.join("\n\n");
    return summarizeWithProviders(combined, "combine", summaryType);
  } catch (error) {
    console.error(
      "❌ [SUMMARY SERVICE] Upstream summary failed, using fallback:",
      error.response?.data || error.message
    );
    return fallbackSummary(cleaned, summaryType);
  }
};
