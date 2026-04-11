const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const { checkAdmin, checkLogin } = require("../services/verityService");
const { route } = require("./userController");

// Get all orders - Admin
router.get("/", checkAdmin, async (req, res) => {
  try {
    const orders = await Order.find();
    res.status(200).json({ status: "success", data: orders });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// Get order user - User
router.get("/user", checkLogin, async (req, res) => {
  try {
    if (req.user.userId !== req.body.userId) {
      return res
        .status(403)
        .json({ status: "error", message: "Permission denied" });
    }
    const orders = await Order.find({ userId: req.user.userId });
    res.status(200).json({ status: "success", data: orders });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// Create order - User
router.post("/", checkLogin, async (req, res) => {
  try {
    const order = new Order(req.body);
    if (order.userId.toString() !== req.user.userId) {
      console.log(order.userId, );
      return res
        .status(403)
        .json({ status: "error", message: "Permission denied" });
    }
    await order.save();
    res.status(201).json({ status: "success", data: order });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// Update order - User
router.post("/:id", checkLogin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res
        .status(404)
        .json({ status: "fail", message: "Order not found" });
    }
    if (order.userId !== req.user.userId) {
      return res
        .status(403)
        .json({ status: "error", message: "Permission denied" });
    }
    if (order.status !== "pending") {
      return res
        .status(403)
        .json({ status: "error", message: "Order cannot be updated" });
    }
    order.set(req.body);
    await order.save();
    res.status(200).json({ status: "success", data: order });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});
// Delete order - User
router.post("/:id", checkLogin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res
        .status(404)
        .json({ status: "fail", message: "Order not found" });
    }
    if (order.userId !== req.user.userId) {
      return res
        .status(403)
        .json({ status: "error", message: "Permission denied" });
    }
    if (order.status !== "pending") {
      return res
        .status(403)
        .json({ status: "error", message: "Order cannot be deleted" });
    }
    // set status to cancel
    order.status = "cancel";
    await order.save();
    res.status(200).json({ status: "success", data: order });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// Update order status - Admin
router.put("/:id/status", checkAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res
        .status(404)
        .json({ status: "fail", message: "Order not found" });
    }
    order.status = req.body.status; // Cập nhật trạng thái
    await order.save(); // Lưu lại thay đổi
    res.status(200).json({ status: "success", data: order });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});


// Delete order - Admin
router.delete("/:id", checkAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res
        .status(404)
        .json({ status: "fail", message: "Order not found" });
    }
    // set status to cancel
    order.status = "cancel";
    await order.save();
    res.status(200).json({ status: "success", data: order });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

module.exports = router;
