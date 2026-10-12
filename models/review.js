const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

// One review per customer per shop - they can edit it later instead of spamming new ones
reviewSchema.index({ shop: 1, customer: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
