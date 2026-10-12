const mongoose = require("mongoose");

async function connectDB() {
  try {
    // For now this points at localhost via MONGO_URI in .env
    // Later, just change MONGO_URI to your Mongo Atlas connection string
    // e.g. mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/saloonDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected:", mongoose.connection.host);
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
