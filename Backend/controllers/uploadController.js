const express = require('express');
const multer = require('multer');
const storage = require('../services/cloudinary.config');
const router = express.Router();

const upload = multer({ storage });

router.post('/', upload.single('imageUrl'), (req, res) => {
  if (!req.file) {
    return res.status(500).json({ message: 'No file uploaded' });
  }
  res.status(200).json({ imageUrl: req.file.path });
});

module.exports = router;
