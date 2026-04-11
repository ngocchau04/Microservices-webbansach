const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const { checkLogin } = require("../services/verityService");

// Get reviews by product id
router.get("/:productId", async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId });
    res.status(200).json({ status: "success", data: reviews });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// Create review
router.post("/", checkLogin, async (req, res) => {
  try {
    req.body.userId = req.user.id;
    const review = new Review(req.body);
    await review.save();
    res.status(201).json({ status: "success", data: review });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// Update review
router.put("/:id", checkLogin, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res
        .status(404)
        .json({ status: "fail", message: "Review not found" });
    }
    if (req.user.id !== review.userId) {
      return res
        .status(403)
        .json({ status: "fail", message: "Permission denied" });
    }
    review.set(req.body);
    await review.save();
    res.status(200).json({ status: "success", data: review });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

module.exports = router;
