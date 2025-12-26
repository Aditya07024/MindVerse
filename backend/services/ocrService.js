const axios = require("axios");

exports.extractText = async ({ fileUrl }) => {
  const res = await axios.post("http://127.0.0.1:7000/ocr", {
    url: fileUrl,
  });

  if (!res.data.success) {
    throw new Error("OCR failed");
  }

  return res.data.text;
};