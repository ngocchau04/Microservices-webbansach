const mongoose = require("mongoose");

const corpusSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, default: "public", index: true },
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
    embedding: { type: [Number], default: undefined },
  },
  { versionKey: false }
);

corpusSchema.index({ tenantId: 1, title: "text", body: "text", keywords: "text" });
corpusSchema.index({ tenantId: 1, sourceType: 1, refId: 1 });
corpusSchema.index({ tenantId: 1, sourceType: 1 });

const CorpusDocument = mongoose.model("assistant_corpus", corpusSchema);

module.exports = {
  CorpusDocument,
};
