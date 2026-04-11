const mongoose = require("mongoose");

const reportCacheSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

const ReportCache = mongoose.model("reporting_cache", reportCacheSchema);

module.exports = ReportCache;
