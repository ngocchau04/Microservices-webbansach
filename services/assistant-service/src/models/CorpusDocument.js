const mongoose = require("mongoose");

const corpusSchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
      enum: ["catalog", "support", "faq"],
      required: true,
      index: true,
    },
    refId: { type: String, default: "" },
    title: { type: String, required: true },
    body: { type: String, required: true },
    keywords: [{ type: String }],
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    indexedAt: { type: Date, default: Date.now },
    normalizedText: { type: String, default: "", index: true },
  },
  { versionKey: false }
);

corpusSchema.index({ title: "text", body: "text", keywords: "text" });

const CorpusDocument = mongoose.model("assistant_corpus", corpusSchema);

module.exports = {
  CorpusDocument,
};
