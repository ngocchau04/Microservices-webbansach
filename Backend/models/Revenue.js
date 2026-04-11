const mongoose = require('mongoose');

const RevenueSchema = new mongoose.Schema({
    year: Number,
    revenue: Array
  }, {versionKey : false});

const Revenue = mongoose.model("revenues", RevenueSchema);

module.exports = Revenue;