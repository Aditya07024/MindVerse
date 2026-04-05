const axios = require("axios");

const DEFAULT_QUESTION_COUNT = 8;

function normalizeText(text) {
  return (text || "").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function buildPrompt({ title, summary, text, questionCount }) {
  const trimmedSummary = normalizeText(summary).slice(0, 4000);
  const trimmedText = normalizeText(text).slice(0, 12000);

  return [
    "Generate a multiple-choice quiz in strict JSON.",
    "Return only JSON with this shape:",
    '{"title":"string","description":"string","duration":10,"questions":[{"question":"string","options":["a","b","c","d"],"correctAnswer":0,"explanation":"string"}]}',
    `Create ${questionCount} questions.`,
    "Rules:",
    "- Use exactly 4 options per question.",
    "- correctAnswer must be the 0-based index of the correct option.",
    "- Questions must test understanding, not trivial wording matches.",
    "- Keep explanations short and useful.",
    "- Avoid duplicate questions.",
    "",
    `Document title: ${title || "Study Material"}`,
    "",
    "Summary:",
    trimmedSummary || "No summary available.",
    "",
    "Document text:",
    trimmedText,
  ].join("\n");
}

function extractJson(text) {
  const cleaned = (text || "").trim();
  const fencedMatch = cleaned.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

function sanitizeQuiz(rawQuiz, fallbackTitle) {
  const questions = Array.isArray(rawQuiz?.questions) ? rawQuiz.questions : [];

  const sanitizedQuestions = questions
    .map((question) => {
      const options = Array.isArray(question?.options)
        ? question.options.map((option) => String(option || "").trim()).filter(Boolean)
        : [];

      const correctAnswer = Number(question?.correctAnswer);

      if (!question?.question || options.length !== 4) {
        return null;
      }

      if (!Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer > 3) {
        return null;
      }

      return {
        question: String(question.question).trim(),
        options,
        correctAnswer,
        explanation: String(question.explanation || "").trim(),
      };
    })
    .filter(Boolean);

  if (!sanitizedQuestions.length) {
    throw new Error("Model did not return valid quiz questions");
  }

  return {
    title: String(rawQuiz?.title || `${fallbackTitle} Quiz`).trim(),
    description: String(
      rawQuiz?.description || "AI-generated quiz based on your document and summary."
    ).trim(),
    duration: Number(rawQuiz?.duration) > 0 ? Number(rawQuiz.duration) : 10,
    questions: sanitizedQuestions,
  };
}

async function callOpenRouter(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENROUTER_QUIZ_MODEL || process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";

  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert educational quiz generator. Output only valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
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

async function callAnthropic(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const model = process.env.ANTHROPIC_QUIZ_MODEL || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model,
      max_tokens: 1600,
      system:
        "You are an expert educational quiz generator. Return only valid JSON.",
      messages: [
        {
          role: "user",
          content: prompt,
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

function getProviderOrder() {
  const configured = (process.env.QUIZ_PROVIDER || process.env.SUMMARY_PROVIDER || "")
    .trim()
    .toLowerCase();

  if (configured === "openrouter") return ["openrouter"];
  if (configured === "anthropic") return ["anthropic"];

  const providers = [];
  if (process.env.OPENROUTER_API_KEY) providers.push("openrouter");
  if (process.env.ANTHROPIC_API_KEY) providers.push("anthropic");
  return providers;
}

function buildFallbackQuiz({ title, summary, text, questionCount }) {
  const sentences = normalizeText(`${summary}\n${text}`)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 30)
    .slice(0, questionCount);

  const questions = sentences.map((sentence, index) => ({
    question: `Which statement best matches this study note?`,
    options: [
      sentence,
      `This topic is unrelated to ${title || "the document"}.`,
      "The material concludes that no further review is needed.",
      "The note focuses only on formatting and layout details.",
    ],
    correctAnswer: 0,
    explanation: sentence,
  }));

  if (!questions.length) {
    throw new Error("Not enough content to generate quiz");
  }

  return {
    title: `${title || "Document"} Quiz`,
    description: "Quiz generated from the available study content.",
    duration: 10,
    questions,
  };
}

exports.generateQuizFromContent = async ({
  title,
  summary,
  text,
  questionCount = DEFAULT_QUESTION_COUNT,
}) => {
  const normalizedSummary = normalizeText(summary);
  const normalizedText = normalizeText(text);

  if (!normalizedSummary && !normalizedText) {
    throw new Error("No document content available for quiz generation");
  }

  const prompt = buildPrompt({
    title,
    summary: normalizedSummary,
    text: normalizedText,
    questionCount,
  });

  const providers = getProviderOrder();
  for (const provider of providers) {
    try {
      const raw =
        provider === "openrouter"
          ? await callOpenRouter(prompt)
          : await callAnthropic(prompt);

      if (!raw) continue;

      return sanitizeQuiz(JSON.parse(extractJson(raw)), title || "Document");
    } catch (error) {
      console.error(
        `❌ [QUIZ SERVICE] ${provider} failed, trying next provider:`,
        error.response?.data || error.message
      );
    }
  }

  return buildFallbackQuiz({
    title,
    summary: normalizedSummary,
    text: normalizedText,
    questionCount,
  });
};
