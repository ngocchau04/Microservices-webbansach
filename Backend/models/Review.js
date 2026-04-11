const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "products" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "accounts" },
    rating: { type: Number },
    review: { type: String },
  },
  { versionKey: false }
);

const Review = mongoose.model("reviews", ReviewSchema);

module.exports = Review;
