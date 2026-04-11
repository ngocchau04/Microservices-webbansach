const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  imgSrc: { type: String, required: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  translator: { type: String },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  discount: { type: Number, min: 0, max: 100},
  rating: { type: Number, min: 1, max: 5},
  reviewsCount: { type: Number },
  soldCount: { type: Number },
  features: [{ type: String }],
  similarBooks: [
    {
      title: { type: String },
      imgSrc: { type: String }
    }
  ],
  sku: { type: String },
  ageGroup: { type: String },
  supplier: { type: String },
  publisher: { type: String },
  publicationYear: { type: Number },
  language: { type: String },
  weight: { type: String },
  dimensions: { type: String },
  pages: { type: Number },
  binding: { type: String },

  // New fields
  description: { type: String }, // Product description
  type: {
    type: String,
    enum: ['V', 'K', 'G', 'T', 'A', 'N', 'C', 'I', 'Y', 'D'],
    // V: Văn học
    // K: Kinh tế - Kinh doanh
    // G: Giáo dục - Học thuật
    // T: Thiếu nhi
    // A: Kỹ năng sống
    // N: Nuôi dạy con
    // C: Chính trị - Pháp luật
    // I: Điện ảnh - Âm nhạc - Hội họa
    // Y: Y học - Sức khỏe
    // D: Du lịch - Thể thao

    required: true
  }
});

module.exports = mongoose.model('Product', productSchema);
