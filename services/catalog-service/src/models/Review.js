const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "catalog_products",
      required: true,
      index: true,
    },
    userId: { type: String, default: null },
    orderId: { type: String, default: null },
    username: { type: String, default: "Anonymous" },
    content: { type: String, required: true },
    stars: { type: Number, required: true, min: 1, max: 5 },
  },
  { versionKey: false, timestamps: true }
);

const Review = mongoose.model("catalog_reviews", reviewSchema);

module.exports = Review;
