const mongoose = require("mongoose");

const graphEntitySchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    entityId: { type: String, required: true },
    type: { type: String, required: true, index: true },
    refId: { type: String, default: "", index: true },
    name: { type: String, required: true },
    normalizedName: { type: String, default: "", index: true },
    metadata: { type: Object, default: {} },
    confidence: { type: Number, default: 1.0 },
  },
  { timestamps: true, versionKey: false }
);

graphEntitySchema.index({ tenantId: 1, entityId: 1 }, { unique: true });

const GraphEntity = mongoose.model("assistant_graph_entities", graphEntitySchema);

module.exports = {
  GraphEntity,
};

