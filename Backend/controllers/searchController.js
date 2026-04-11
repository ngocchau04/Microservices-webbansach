const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const mongoose = require("mongoose");

// Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// Get top 25 products
router.get("/top24", async (req, res) => {
  try {
    const products = await Product.find().limit(24);
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// Get top 10 products by sold quantity
router.get("/top10", async (req, res) => {
  try {
    // sort by soldCount
    const products = await Product.find({soldCount:{ $exists: true }}).sort({ soldCount: -1 }).limit(10);
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// Get top 10 products sale
router.get("/sale10", async (req, res) => {
  try {
    const products = await Product.find({ discount: { $exists: true } }).sort({ discount: -1 }).limit(10);
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

router.post("/filter", async (req, res) => {
  try {
    // Lấy dữ liệu từ body và query
    const {
      type = "",
      title = "",
      author = "",
      isSortByPrice = false,
      isSortByRating = false,
      isSortByDiscount = false,
      minPrice = 0, 
      maxPrice = Number.MAX_SAFE_INTEGER, 
    } = req.body;
    const { page = 1, limit = 10 } = req.query;

    // Tạo đối tượng truy vấn
    const query = {};
    if (type) query.type = type;
    if (author) query.author = author;
    if (title) query.title = { $regex: title, $options: "i" }; // Tìm kiếm không phân biệt chữ hoa/thường

    // Lọc theo khoảng giá
    query.price = { $gte: Number(minPrice), $lte: Number(maxPrice) }; // Giá >= minPrice và <= maxPrice

    // Lấy tổng số sản phẩm phù hợp
    const total = await Product.countDocuments(query);

    // Tạo đối tượng sắp xếp
    const sort = {};
    if (isSortByPrice) {
      sort.price = -isSortByPrice; // Sắp xếp tăng dần
    }
    if (isSortByRating) {
      sort.rating = -isSortByRating; // Sắp xếp giảm dần
    }
    if (isSortByDiscount) {
      sort.discount = -isSortByDiscount; // Sắp xếp giảm dần
    }

    // Lấy danh sách sản phẩm với phân trang và sắp xếp
    const products = await Product.find(query)
      .sort(sort) // Sử dụng đối tượng `sort` để sắp xếp
      .limit(limit * 1) // Giới hạn số lượng kết quả
      .skip((page - 1) * limit); // Bỏ qua các kết quả trước đó

    // Trả về kết quả
    res.status(200).json({ products, total });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// Get top authors and name of books
router.get("/topAuthors", async (req, res) => {
  try {
    const authors = await Product.aggregate([
      {
        $group: {
          _id: "$author", // Nhóm theo tác giả
          count: { $sum: 1 }, // Đếm số lượng sách
          books: { $push: "$title" }, // Lưu danh sách tên sách của tác giả
        },
      },
      { $sort: { count: -1 } }, // Sắp xếp theo số lượng sách giảm dần
      { $limit: 5 }, // Lấy 5 tác giả có số lượng sách nhiều nhất
    ]);

    res.status(200).json(authors);
  } catch (error) {
    console.error("Error fetching authors:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});


module.exports = router;
