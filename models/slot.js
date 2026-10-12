const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    date: { type: String, required: true }, // stored as "YYYY-MM-DD"
    startTime: { type: String, required: true }, // "HH:MM" 24hr
    endTime: { type: String, required: true },
    isBooked: { type: Boolean, default: false },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    bookedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Prevent the same shop from having a duplicate slot on the same day/time
slotSchema.index({ shop: 1, date: 1, startTime: 1 }, { unique: true });

module.exports = mongoose.model("Slot", slotSchema);
