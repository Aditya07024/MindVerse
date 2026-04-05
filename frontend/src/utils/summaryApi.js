import axios from "axios";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

export const generateSummary = async (fileId) => {
  const payload =
    typeof fileId === "object" && fileId !== null ? fileId : { fileId };
  const res = await axios.post(`${API_BASE}/summary/generate`, payload);
  return res.data;
};

export const extractTextOnly = async ({
  fileId,
  fileUrl,
  userId,
  fileType,
  filename,
  text,
}) => {
  const res = await axios.post(`${API_BASE}/ocr/extract`, {
    fileId,
    fileUrl,
    userId,
    fileType,
    filename,
    text,
  });
  return res.data;
};

export const getSummaryByFileId = async (fileId) => {
  const res = await axios.get(`${API_BASE}/summary/${fileId}`);
  return res.data;
};

export const getFlashcardsByFileId = async (fileId) => {
  const res = await axios.get(`${API_BASE}/flashcards/${fileId}`);
  return res.data;
};

export const generateFlashcards = async (payload) => {
  const res = await axios.post(`${API_BASE}/flashcards/generate`, payload);
  return res.data;
};
