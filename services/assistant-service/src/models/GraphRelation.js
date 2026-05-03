const mongoose = require("mongoose");

const graphRelationSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    sourceId: { type: String, required: true, index: true },
    targetId: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    metadata: { type: Object, default: {} },
    confidence: { type: Number, default: 1.0 },
  },
  { timestamps: true, versionKey: false }
);

graphRelationSchema.index(
  { tenantId: 1, sourceId: 1, targetId: 1, type: 1 },
  { unique: true }
);

const GraphRelation = mongoose.model("assistant_graph_relations", graphRelationSchema);

module.exports = {
  GraphRelation,
};

