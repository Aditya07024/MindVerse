const axios = require("axios");

function normalizeText(text) {
  return (text || "").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function extractJson(text) {
  const cleaned = (text || "").trim();
  const fenced = cleaned.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return cleaned.slice(first, last + 1);
  }
  return cleaned;
}

function buildFallbackCards(summary, text, count) {
  const source = normalizeText(`${summary}\n${text}`)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 35)
    .slice(0, count);

  return source.map((sentence, index) => ({
    front: `Key point ${index + 1}`,
    back: sentence,
  }));
}

function sanitizeCards(parsed, count) {
  const cards = Array.isArray(parsed?.cards) ? parsed.cards : [];
  const normalized = cards
    .map((card) => ({
      front: String(card?.front || "").trim(),
      back: String(card?.back || "").trim(),
    }))
    .filter((card) => card.front && card.back)
    .slice(0, count);

  if (!normalized.length) {
    throw new Error("Model did not return valid flashcards");
  }

  return normalized;
}

async function callOpenRouter(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const model = process.env.OPENROUTER_FLASHCARD_MODEL || process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You create concise study flashcards. Return only JSON in the format {\"cards\":[{\"front\":\"...\",\"back\":\"...\"}]}",
        },
        { role: "user", content: prompt },
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

exports.generateFlashcards = async ({ title, summary, text, cardCount = 10 }) => {
  const normalizedSummary = normalizeText(summary);
  const normalizedText = normalizeText(text);
  const prompt = [
    "Create revision flashcards from this material.",
    `Return ${cardCount} flashcards in strict JSON.`,
    "Each flashcard should have a short front and a precise back.",
    "Prioritize definitions, concepts, steps, and important facts.",
    `Title: ${title || "Document"}`,
    "",
    "Summary:",
    normalizedSummary || "No summary available.",
    "",
    "Document text:",
    normalizedText.slice(0, 10000),
  ].join("\n");

  if (process.env.OPENROUTER_API_KEY) {
    try {
      const raw = await callOpenRouter(prompt);
      if (raw) {
        return sanitizeCards(JSON.parse(extractJson(raw)), cardCount);
      }
    } catch (error) {
      console.error(
        "❌ [FLASHCARD SERVICE] openrouter failed, using fallback:",
        error.response?.data || error.message
      );
    }
  }

  return buildFallbackCards(normalizedSummary, normalizedText, cardCount);
};
