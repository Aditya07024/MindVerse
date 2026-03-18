const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes");

const app = express();

app.use(cors());
app.use(express.json());

console.log("🚀 Setting up routes...");
app.use("/api/auth", authRoutes); // ✅ THIS FIXES 404
app.use("/api", fileRoutes);
console.log("✅ All routes mounted");

module.exports = app;
