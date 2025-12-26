const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema(
  {
    userId: mongoose.Schema.Types.ObjectId,
    fileId: mongoose.Schema.Types.ObjectId,

    questions: [
      {
        question: String,
        options: [String],
        correctAnswer: Number,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quiz", quizSchema);