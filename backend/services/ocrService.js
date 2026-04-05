const axios = require("axios");
const Tesseract = require("tesseract.js");

function normalizeText(text) {
  return (text || "").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function decodePdfString(value) {
  return value
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\");
}

function extractTextFromPdfBuffer(buffer) {
  const raw = buffer.toString("latin1");
  const textParts = [];

  const tjMatches = raw.matchAll(/\(([^()]*(?:\\.[^()]*)*)\)\s*Tj/g);
  for (const match of tjMatches) {
    textParts.push(decodePdfString(match[1]));
  }

  const tjArrayMatches = raw.matchAll(/\[(.*?)\]\s*TJ/gs);
  for (const match of tjArrayMatches) {
    const segment = match[1];
    const strings = segment.matchAll(/\(([^()]*(?:\\.[^()]*)*)\)/g);
    for (const stringMatch of strings) {
      textParts.push(decodePdfString(stringMatch[1]));
    }
  }

  return normalizeText(textParts.join(" "));
}

async function downloadFile(fileUrl) {
  const response = await axios.get(fileUrl, {
    responseType: "arraybuffer",
    timeout: 120000,
  });

  return {
    buffer: Buffer.from(response.data),
    contentType: response.headers["content-type"] || "",
  };
}

async function extractImageText(buffer) {
  const result = await Tesseract.recognize(buffer, "eng");
  return normalizeText(result?.data?.text || "");
}

exports.extractText = async ({ fileUrl, fileType, filename, text }) => {
  if (text && normalizeText(text)) {
    return normalizeText(text);
  }

  if (!fileUrl) {
    throw new Error("fileUrl is required for OCR extraction");
  }

  const { buffer, contentType } = await downloadFile(fileUrl);
  const resolvedType = (fileType || contentType || "").toLowerCase();
  const resolvedName = (filename || "").toLowerCase();
  const looksLikePdf =
    resolvedType.includes("pdf") ||
    resolvedName.endsWith(".pdf") ||
    fileUrl.toLowerCase().includes(".pdf");

  if (resolvedType.startsWith("text/")) {
    return normalizeText(buffer.toString("utf8"));
  }

  if (looksLikePdf) {
    const extractedText = extractTextFromPdfBuffer(buffer);
    if (extractedText) {
      return extractedText;
    }

    throw new Error(
      "Could not extract text from this PDF on the backend. Send extracted PDF text from the client."
    );
  }

  if (resolvedType.startsWith("image/")) {
    const extractedText = await extractImageText(buffer);
    if (extractedText) {
      return extractedText;
    }

    throw new Error("No text detected in image");
  }

  return normalizeText(buffer.toString("utf8"));
};
