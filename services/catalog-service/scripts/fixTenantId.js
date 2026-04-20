const mongoose = require("mongoose");
const { getEnvConfig } = require("../src/config/env");
const { connectDatabase } = require("../src/config/database");
const Product = require("../src/models/Product");

const run = async () => {
  const config = getEnvConfig();
  await connectDatabase({ mongoUri: config.mongoUri, dbName: config.dbName });

  const result = await Product.updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId: "public" } }
  );

  console.log(`[catalog-fix] matched ${result.matchedCount}, modified ${result.modifiedCount}`);
  await mongoose.connection.close();
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
