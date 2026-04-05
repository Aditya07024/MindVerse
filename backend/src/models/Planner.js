const mongoose = require("mongoose");

const plannerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    subjects: {
      type: [String],
      default: [],
    },
    hoursPerDay: {
      type: Number,
      required: true,
      min: 1,
    },
    examDate: {
      type: Date,
      required: true,
    },
    schedule: {
      type: [
        {
          date: String,
          dateFormatted: String,
          subjects: [
            {
              name: String,
              hours: Number,
            },
          ],
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Planner", plannerSchema);
