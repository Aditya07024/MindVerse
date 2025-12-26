const axios = require("axios");

exports.detectTextType = async (fileUrl) => {
  // Use PaddleOCR lightweight pass for detection
  const res = await axios.post("http://localhost:7000/detect", {
    fileUrl,
  });

  return res.data.type; // "handwritten" | "printed"
};