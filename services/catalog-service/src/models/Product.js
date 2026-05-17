const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    tenantId: { type: String, default: "public", index: true },
    imgSrc: { type: String, required: true },
    title: { type: String, required: true, index: true },
    author: { type: String, required: true, index: true },
    translator: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, default: 0, min: 0 },
    discount: { type: Number, min: 0, max: 100, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewsCount: { type: Number, default: 0, min: 0 },
    soldCount: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    features: [{ type: String }],
    similarBooks: [
      {
        title: { type: String },
        imgSrc: { type: String },
      },
    ],
    sku: { type: String, default: "" },
    ageGroup: { type: String, default: "" },
    supplier: { type: String, default: "" },
    publisher: { type: String, default: "" },
    publicationYear: { type: Number },
    language: { type: String, default: "none" },
    weight: { type: String, default: "" },
    dimensions: { type: String, default: "" },
    pages: { type: Number },
    binding: { type: String, default: "" },
    description: { type: String, default: "" },
    type: {
      type: String,
      enum: ["V", "K", "G", "T", "A", "N", "C", "I", "Y", "D"],
      required: true,
      index: true,
    },
    /** Admin: hide from storefront listings when true (optional; defaults visible). */
    isHidden: { type: Boolean, default: false, index: true },
  },
  { versionKey: false, timestamps: true }
);

productSchema.index({ title: "text", author: "text", description: "text" });

const Product = mongoose.model("catalog_products", productSchema);

module.exports = Product;
