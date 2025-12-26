const axios = require("axios");

exports.generateSummary = async (text) => {
  const res = await axios.post("http://127.0.0.1:7100/summarize", {
    text,
  });

  if (!res.data.success) {
    throw new Error("Summary failed");
  }

  return res.data.summary;
};