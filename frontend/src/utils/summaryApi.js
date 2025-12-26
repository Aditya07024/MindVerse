import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

export const generateSummary = async (fileId) => {
  const res = await axios.post(`${API_BASE}/summary/generate`, {
    fileId,
  });

  return res.data;
};