const mongoose = require("mongoose");

const connectDatabase = async ({ mongoUri, dbName }) => {
  await mongoose.connect(mongoUri, { dbName });
  console.log(`[catalog-service] MongoDB connected (${dbName})`);
};

module.exports = {
  connectDatabase,
};
