const mongoose = require("mongoose");   // ✅ ADD THIS LINE

const fileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: String,
    fileSize: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("File", fileSchema);