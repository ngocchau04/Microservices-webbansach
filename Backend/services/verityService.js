const jwt = require("jsonwebtoken");
require("dotenv").config();

const SECRET_KEY = process.env.SECRET_KEY;

const checkAdmin = async (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      return res.status(401).json({ status: "error", message: "Unauthorized - No token provided" });
    }
    
    const authHeader = req.headers.authorization;
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ status: "error", message: "Invalid token format. Use: Bearer <token>" });
    }
    
    const token = authHeader.split(" ")[1];
    if (!token || token === "undefined" || token === "null") {
      return res.status(401).json({ status: "error", message: "Invalid or missing token" });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    if (req.user.role === "admin") {
      next();
    } else {
      res.status(403).json({ status: "error", message: "Permission denied" });
    }
  } catch (error) {
    console.error("Error:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ status: "error", message: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ status: "error", message: "Token expired" });
    }
    res.status(500).json({ status: "error", message: "Server error" });
  }
};

const checkLogin = async (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      return res.status(401).json({ status: "error", message: "Unauthorized - No token provided" });
    }
    
    const authHeader = req.headers.authorization;
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ status: "error", message: "Invalid token format. Use: Bearer <token>" });
    }
    
    const token = authHeader.split(" ")[1];
    if (!token || token === "undefined" || token === "null") {
      return res.status(401).json({ status: "error", message: "Invalid or missing token" });
    }
    
    const decoded = jwt.verify(token, SECRET_KEY);
    console.log(decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Error:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ status: "error", message: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ status: "error", message: "Token expired" });
    }
    res.status(500).json({ status: "error", message: "Server error" });
  }
};

module.exports = { checkAdmin, checkLogin };
