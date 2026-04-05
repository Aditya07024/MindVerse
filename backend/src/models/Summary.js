const mongoose = require("mongoose");

const summarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      required: true,
      unique: true, // one summary per file
    },

    text: String,

    summary: String,

    ocrModel: {
      type: String,
      enum: ["printed", "handwritten"],
    },

    summaryType: {
      type: String,
      enum: ["short", "detailed", "bullet", "exam"],
      default: "detailed",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Summary", summarySchema);
