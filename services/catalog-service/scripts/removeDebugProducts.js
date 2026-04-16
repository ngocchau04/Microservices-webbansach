require("dotenv").config();

const mongoose = require("mongoose");
const { getEnvConfig } = require("../src/config/env");
const { connectDatabase } = require("../src/config/database");
const Product = require("../src/models/Product");
const { removeDebugProducts } = require("./debugProductCleanup");

const run = async () => {
  const config = getEnvConfig();
  await connectDatabase({ mongoUri: config.mongoUri, dbName: config.dbName });

  const deleted = await removeDebugProducts(Product);
  console.log(`[catalog-remove-debug-products] deleted ${deleted} document(s)`);
};

run()
  .catch((error) => {
    console.error("[catalog-remove-debug-products] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
