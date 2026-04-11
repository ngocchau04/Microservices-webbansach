const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Revenue = require("../models/Revenue");

router.get('/', (req, res) => {
    Revenue.find({},{_id: 0}).then((data) => {
        res.status(200).send(data);
    }); 
});

module.exports = router;